import { Inject, Injectable } from "@nestjs/common";
import {
  endOfIstDay,
  type ChangePassword,
  permissionsFor,
  type LoginRequest,
  type LoginResponse,
  type RefreshRequest,
  type SessionUser,
  type TokenPair,
} from "@edusuite/shared";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "./authUser";
import {
  ACCESS_TOKEN_TTL_MS,
  burnPasswordCheck,
  hashPassword,
  hashRefreshToken,
  newRefreshToken,
  signAccessToken,
  verifyPassword,
} from "./crypto";

/** Plan §09: lock for 15 minutes after 5 wrong attempts. */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

type Ctx = { ip?: string | undefined };

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get secret(): string {
    if (!this.env.JWT_SECRET) throw new ApiHttpException(503, "SERVICE_UNAVAILABLE");
    return this.env.JWT_SECRET;
  }

  /**
   * Finds the user by employee code, email or mobile number. The role always
   * comes from the database record, never from the shape of the ID (AGENT_README §8).
   */
  private findByIdentifier(identifier: string) {
    const db = this.prisma.db;
    const digits = identifier.replace(/\D/g, "");
    const where = identifier.includes("@")
      ? { email: { equals: identifier.toLowerCase(), mode: "insensitive" as const } }
      : /^[+\d\s-]+$/.test(identifier) && digits.length >= 10
        ? { phone: `+91${digits.slice(-10)}` }
        : { employeeCode: { equals: identifier, mode: "insensitive" as const } };
    return db.appUser.findFirst({ where, include: { branches: true } });
  }

  async login(input: LoginRequest, ctx: Ctx): Promise<LoginResponse> {
    const db = this.prisma.db;
    const user = await this.findByIdentifier(input.identifier);

    if (!user) {
      await burnPasswordCheck(input.password);
      await this.audit.log({ action: "auth.login_failed", meta: { reason: "unknown_id" }, ip: ctx.ip });
      throw new ApiHttpException(401, "AUTH_INVALID");
    }

    const base = { instituteId: user.instituteId, actorId: user.id, ip: ctx.ip };
    const now = new Date();

    if (user.lockedUntil && user.lockedUntil > now) {
      await burnPasswordCheck(input.password);
      await this.audit.log({ ...base, action: "auth.login_failed", meta: { reason: "locked" } });
      throw new ApiHttpException(423, "AUTH_LOCKED", { lockedUntil: user.lockedUntil.toISOString() });
    }

    const passwordOk = await verifyPassword(user.passwordHash, input.password);
    if (!passwordOk) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await db.appUser.update({
        where: { id: user.id },
        data: lock
          ? { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MS) }
          : { failedLoginCount: failed },
      });
      await this.audit.log({
        ...base,
        action: lock ? "auth.locked" : "auth.login_failed",
        meta: { reason: "wrong_password", attempt: failed },
      });
      throw new ApiHttpException(401, "AUTH_INVALID");
    }

    // Only after the password is right, so a blocked status can't be probed with a wrong password.
    if (user.status === "blocked") {
      await this.audit.log({ ...base, action: "auth.login_failed", meta: { reason: "blocked" } });
      throw new ApiHttpException(403, "AUTH_BLOCKED");
    }

    const allowedBranchIds = new Set([user.branchId, ...user.branches.map((b) => b.branchId)]);
    const branchId = input.branchId ?? user.branchId;
    if (!allowedBranchIds.has(branchId)) {
      await this.audit.log({ ...base, action: "auth.login_failed", meta: { reason: "branch_not_allowed" } });
      throw new ApiHttpException(403, "AUTH_BRANCH_NOT_ALLOWED");
    }

    await db.appUser.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });

    const refreshToken = newRefreshToken();
    const expiresAt = endOfIstDay(now);
    const session = await db.session.create({
      data: {
        userId: user.id,
        refreshHash: hashRefreshToken(refreshToken),
        deviceId: input.deviceId,
        branchId,
        expiresAt,
      },
    });
    await this.audit.log({ ...base, action: "auth.login", entityType: "session", entityId: session.id, meta: { branchId } });

    const authUser: AuthUser = {
      userId: user.id,
      sessionId: session.id,
      instituteId: user.instituteId,
      branchId,
      role: user.role,
    };
    const tokens = await this.issueTokens(authUser, refreshToken, expiresAt);
    return { ...tokens, user: await this.me(authUser) };
  }

  /**
   * Rotates the refresh token. Presenting a token that was already rotated, or from
   * another device, means it was copied: every session of that user is ended (plan §09).
   * A token whose session simply ended (logout, block, password change) is refused
   * without that alarm, so another PC's late refresh can't sign the user out here (DN-070).
   */
  async refresh(input: RefreshRequest, ctx: Ctx): Promise<TokenPair> {
    const db = this.prisma.db;
    const old = await db.session.findUnique({
      where: { refreshHash: hashRefreshToken(input.refreshToken) },
      include: { user: true },
    });
    if (!old) throw new ApiHttpException(401, "UNAUTHORIZED");

    const base = { instituteId: old.user.instituteId, actorId: old.userId, ip: ctx.ip };
    const now = new Date();

    if (old.replacedById || old.deviceId !== input.deviceId) {
      await this.revokeAllSessions(old.userId, now);
      await this.audit.log({
        ...base,
        action: "auth.refresh_reuse",
        entityType: "session",
        entityId: old.id,
        meta: { deviceMismatch: old.deviceId !== input.deviceId },
      });
      throw new ApiHttpException(401, "AUTH_SESSION_REVOKED");
    }
    if (old.revokedAt) throw new ApiHttpException(401, "AUTH_SESSION_REVOKED");
    if (old.expiresAt <= now) throw new ApiHttpException(401, "AUTH_SESSION_EXPIRED");
    if (old.user.status === "blocked") {
      await this.revokeAllSessions(old.userId, now);
      throw new ApiHttpException(403, "AUTH_BLOCKED");
    }

    const refreshToken = newRefreshToken();
    const next = await db.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: old.userId,
          refreshHash: hashRefreshToken(refreshToken),
          deviceId: old.deviceId,
          branchId: old.branchId,
          expiresAt: old.expiresAt,
        },
      });
      // Conditional update: if two refreshes race, only one wins; the other is treated as reuse.
      const { count } = await tx.session.updateMany({
        where: { id: old.id, revokedAt: null, replacedById: null },
        data: { revokedAt: now, replacedById: created.id, lastUsedAt: now },
      });
      if (count !== 1) throw new ApiHttpException(401, "AUTH_SESSION_REVOKED");
      return created;
    });

    return this.issueTokens(
      {
        userId: old.userId,
        sessionId: next.id,
        instituteId: old.user.instituteId,
        branchId: old.branchId,
        role: old.user.role,
      },
      refreshToken,
      old.expiresAt,
    );
  }

  async logout(refreshToken: string, ctx: Ctx): Promise<void> {
    const db = this.prisma.db;
    const session = await db.session.findUnique({
      where: { refreshHash: hashRefreshToken(refreshToken) },
      include: { user: { select: { instituteId: true } } },
    });
    if (!session || session.revokedAt) return;
    await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    await this.audit.log({
      instituteId: session.user.instituteId,
      actorId: session.userId,
      action: "auth.logout",
      entityType: "session",
      entityId: session.id,
      ip: ctx.ip,
    });
  }

  /**
   * Moves the signed-in session to another branch the user may work at (DN-070, DN-015).
   * The current session is replaced by a new one at that branch, with the same device and
   * end of day, so its old refresh token stops working.
   */
  async switchBranch(actor: AuthUser, branchId: string, ctx: Ctx): Promise<LoginResponse> {
    const db = this.prisma.db;
    const user = await db.appUser.findUnique({ where: { id: actor.userId }, include: { branches: true } });
    if (!user || user.instituteId !== actor.instituteId) throw new ApiHttpException(401, "UNAUTHORIZED");
    const allowed = new Set([user.branchId, ...user.branches.map((b) => b.branchId)]);
    if (!allowed.has(branchId)) throw new ApiHttpException(403, "AUTH_BRANCH_NOT_ALLOWED");

    const old = await db.session.findUnique({ where: { id: actor.sessionId } });
    const now = new Date();
    if (!old || old.revokedAt || old.replacedById || old.expiresAt <= now) throw new ApiHttpException(401, "AUTH_SESSION_REVOKED");

    const refreshToken = newRefreshToken();
    const next = await db.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: { userId: user.id, refreshHash: hashRefreshToken(refreshToken), deviceId: old.deviceId, branchId, expiresAt: old.expiresAt },
      });
      const { count } = await tx.session.updateMany({
        where: { id: old.id, revokedAt: null, replacedById: null },
        data: { revokedAt: now, replacedById: created.id, lastUsedAt: now },
      });
      if (count !== 1) throw new ApiHttpException(401, "AUTH_SESSION_REVOKED");
      return created;
    });
    await this.audit.log({
      instituteId: user.instituteId,
      actorId: user.id,
      ip: ctx.ip,
      action: "auth.switch_branch",
      entityType: "session",
      entityId: next.id,
      meta: { fromBranchId: old.branchId, branchId },
    });

    const authUser: AuthUser = { userId: user.id, sessionId: next.id, instituteId: user.instituteId, branchId, role: user.role };
    const tokens = await this.issueTokens(authUser, refreshToken, old.expiresAt);
    return { ...tokens, user: await this.me(authUser) };
  }

  /**
   * The signed-in user changes their own password (DN-070; DN-034 "revisit").
   * Every other session of the user ends; this one stays signed in.
   */
  async changePassword(actor: AuthUser, input: ChangePassword, ctx: Ctx): Promise<void> {
    const db = this.prisma.db;
    const user = await db.appUser.findUnique({ where: { id: actor.userId } });
    if (!user || user.instituteId !== actor.instituteId) throw new ApiHttpException(401, "UNAUTHORIZED");
    const base = { instituteId: user.instituteId, actorId: user.id, ip: ctx.ip };
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      await this.audit.log({ ...base, action: "auth.password_change_failed", meta: { reason: "wrong_current" } });
      throw new ApiHttpException(400, "PASSWORD_WRONG");
    }
    if (input.currentPassword === input.newPassword) throw new ApiHttpException(400, "PASSWORD_SAME");
    await db.appUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword), failedLoginCount: 0, lockedUntil: null },
    });
    await db.session.updateMany({
      where: { userId: user.id, revokedAt: null, id: { not: actor.sessionId } },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ ...base, action: "auth.password_change", entityType: "user", entityId: user.id });
  }

  async me(user: AuthUser): Promise<SessionUser> {
    const record = await this.prisma.db.appUser.findUnique({
      where: { id: user.userId },
      include: { institute: true, branch: true, branches: { include: { branch: true } } },
    });
    if (!record || record.instituteId !== user.instituteId) throw new ApiHttpException(401, "UNAUTHORIZED");

    const all = [record.branch, ...record.branches.map((b) => b.branch)];
    const unique = [...new Map(all.map((b) => [b.id, b])).values()];
    const current = unique.find((b) => b.id === user.branchId) ?? record.branch;
    const ref = (b: { id: string; name: string; code: string }) => ({ id: b.id, name: b.name, code: b.code });

    return {
      id: record.id,
      employeeCode: record.employeeCode,
      displayName: record.displayName,
      fullName: record.fullName,
      role: record.role,
      institute: { id: record.institute.id, name: record.institute.name, code: record.institute.code },
      branch: ref(current),
      branches: unique.map(ref),
      permissions: permissionsFor(record.role),
    };
  }

  private async revokeAllSessions(userId: string, now: Date): Promise<void> {
    await this.prisma.db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
  }

  private async issueTokens(user: AuthUser, refreshToken: string, refreshExpiresAt: Date): Promise<TokenPair> {
    // The access token never outlives the day's session.
    const accessExpiresAt = new Date(Math.min(Date.now() + ACCESS_TOKEN_TTL_MS, refreshExpiresAt.getTime()));
    return {
      accessToken: await signAccessToken(user, this.secret, accessExpiresAt),
      accessTokenExpiresAt: accessExpiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }
}
