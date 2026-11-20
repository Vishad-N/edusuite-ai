import { Injectable } from "@nestjs/common";
import {
  UserCreateSchema,
  assignableRoles,
  decodeCursor,
  encodeCursor,
  type Page,
  type ResetPassword,
  type User,
  type UserListQuery,
  type UserUpdate,
} from "@edusuite/shared";
import type { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import type { AppUser, UserBranch } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException } from "../common/errors";
import { hashPassword } from "../auth/crypto";
import type { AuthUser } from "../auth/authUser";
import { scopeWhere } from "../auth/scope";

type Ctx = { ip?: string | undefined };
type Row = AppUser & { branches: UserBranch[] };

function toUser(row: Row): User {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    email: row.email,
    phone: row.phone,
    displayName: row.displayName,
    fullName: row.fullName,
    role: row.role,
    status: row.status,
    branchId: row.branchId,
    extraBranchIds: row.branches.map((b) => b.branchId).filter((id) => id !== row.branchId),
    lockedUntil: row.lockedUntil && row.lockedUntil > new Date() ? row.lockedUntil.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Staff accounts (plan §07 USERS, DN-009, DN-034).
 * - Super admins manage every user in their institute.
 * - Branch admins manage only teachers, typists and counselors whose home
 *   branch is the admin's current branch.
 * - Nobody changes their own role or status, and an institute always keeps
 *   one active super admin. There is no delete, only block.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: UserListQuery): Promise<Page<User>> {
    const scope = scopeWhere(actor, "users.manage");
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    if (cursor === null) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "cursor", rule: "invalid" }] });

    const and: Prisma.AppUserWhereInput[] = [{ instituteId: scope.instituteId }];
    if (scope.branchId) and.push({ branchId: scope.branchId, role: { in: assignableRoles(actor.role) } });
    if (query.role) and.push({ role: query.role });
    if (query.status) and.push({ status: query.status });
    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      and.push({ OR: [{ displayName: contains }, { fullName: contains }, { email: contains }, { employeeCode: contains }] });
    }
    if (cursor) {
      and.push({
        OR: [{ updatedAt: { lt: cursor.updatedAt } }, { updatedAt: cursor.updatedAt, id: { lt: cursor.id } }],
      });
    }

    const rows = await this.prisma.db.appUser.findMany({
      where: { AND: and },
      include: { branches: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return { items: page.map(toUser), nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null };
  }

  async get(actor: AuthUser, id: string): Promise<User> {
    return toUser(await this.loadManageable(actor, id));
  }

  async create(actor: AuthUser, input: z.output<typeof UserCreateSchema>, ctx: Ctx): Promise<User> {
    this.assertRoleAllowed(actor, input.role);
    await this.assertBranchesAllowed(actor, input.branchId, input.extraBranchIds);
    await this.assertUnique({ employeeCode: input.employeeCode, email: input.email, phone: input.phone });

    const passwordHash = await hashPassword(input.password);
    const row = await this.withUniqueCheck(() =>
      this.prisma.db.appUser.create({
        data: {
          instituteId: actor.instituteId,
          branchId: input.branchId,
          employeeCode: input.employeeCode,
          email: input.email,
          phone: input.phone ?? null,
          displayName: input.displayName,
          fullName: input.fullName,
          role: input.role,
          passwordHash,
          branches: { create: extraOnly(input.branchId, input.extraBranchIds).map((branchId) => ({ branchId })) },
        },
        include: { branches: true },
      }),
    );
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "user.create",
      entityType: "user",
      entityId: row.id,
      meta: { role: row.role },
      ip: ctx.ip,
    });
    return toUser(row);
  }

  async update(actor: AuthUser, id: string, input: UserUpdate, ctx: Ctx): Promise<User> {
    const target = await this.loadManageable(actor, id);
    const isSelf = target.id === actor.userId;

    if (input.role !== undefined && input.role !== target.role) {
      if (isSelf) throw new ApiHttpException(403, "CANNOT_CHANGE_SELF");
      this.assertRoleAllowed(actor, input.role);
      if (target.role === "superadmin") await this.assertNotLastSuperadmin(target);
    }
    const branchId = input.branchId ?? target.branchId;
    if (input.branchId !== undefined || input.extraBranchIds !== undefined) {
      await this.assertBranchesAllowed(actor, branchId, input.extraBranchIds ?? []);
    }
    await this.assertUnique({ email: input.email, phone: input.phone ?? undefined }, target.id);

    const db = this.prisma.db;
    const row = await this.withUniqueCheck(() =>
      db.$transaction(async (tx) => {
        if (input.extraBranchIds !== undefined || input.branchId !== undefined) {
          const extra = extraOnly(branchId, input.extraBranchIds ?? target.branches.map((b) => b.branchId));
          await tx.userBranch.deleteMany({ where: { userId: target.id } });
          if (extra.length) await tx.userBranch.createMany({ data: extra.map((b) => ({ userId: target.id, branchId: b })) });
        }
        return tx.appUser.update({
          where: { id: target.id },
          data: {
            ...(input.email !== undefined && { email: input.email }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.displayName !== undefined && { displayName: input.displayName }),
            ...(input.fullName !== undefined && { fullName: input.fullName }),
            ...(input.role !== undefined && { role: input.role }),
            ...(input.branchId !== undefined && { branchId: input.branchId }),
          },
          include: { branches: true },
        });
      }),
    );

    // A role or branch change ends the user's sessions, so new rights apply at once.
    if ((input.role && input.role !== target.role) || (input.branchId && input.branchId !== target.branchId)) {
      await this.revokeSessions(target.id);
    }
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "user.update",
      entityType: "user",
      entityId: target.id,
      // Field names only, never values.
      meta: { fields: Object.keys(input).sort().join(",") },
      ip: ctx.ip,
    });
    return toUser(row);
  }

  async setBlocked(actor: AuthUser, id: string, blocked: boolean, ctx: Ctx): Promise<User> {
    const target = await this.loadManageable(actor, id);
    if (target.id === actor.userId) throw new ApiHttpException(403, "CANNOT_CHANGE_SELF");
    if (blocked && target.role === "superadmin") await this.assertNotLastSuperadmin(target);

    const row = await this.prisma.db.appUser.update({
      where: { id: target.id },
      data: { status: blocked ? "blocked" : "active", ...(blocked ? {} : { failedLoginCount: 0, lockedUntil: null }) },
      include: { branches: true },
    });
    if (blocked) await this.revokeSessions(target.id);
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: blocked ? "user.block" : "user.unblock",
      entityType: "user",
      entityId: target.id,
      ip: ctx.ip,
    });
    return toUser(row);
  }

  /** Sets a new password, clears any lockout and ends every session of that user. */
  async resetPassword(actor: AuthUser, id: string, input: ResetPassword, ctx: Ctx): Promise<void> {
    const target = await this.loadManageable(actor, id);
    await this.prisma.db.appUser.update({
      where: { id: target.id },
      data: { passwordHash: await hashPassword(input.password), failedLoginCount: 0, lockedUntil: null },
    });
    await this.revokeSessions(target.id);
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "user.reset_password",
      entityType: "user",
      entityId: target.id,
      ip: ctx.ip,
    });
  }

  /**
   * Loads a user the actor may manage. Anything outside the actor's reach
   * answers 404, so ids from other institutes or branches can't be probed.
   */
  private async loadManageable(actor: AuthUser, id: string): Promise<Row> {
    const scope = scopeWhere(actor, "users.manage");
    const row = await this.prisma.db.appUser.findFirst({
      where: { id, instituteId: scope.instituteId, ...(scope.branchId && { branchId: scope.branchId }) },
      include: { branches: true },
    });
    if (!row) throw new ApiHttpException(404, "NOT_FOUND");
    if (row.id !== actor.userId && !assignableRoles(actor.role).includes(row.role)) {
      // A branch admin can see neither other admins nor super admins in their branch.
      throw new ApiHttpException(404, "NOT_FOUND");
    }
    return row;
  }

  private assertRoleAllowed(actor: AuthUser, role: User["role"]): void {
    if (!assignableRoles(actor.role).includes(role)) throw new ApiHttpException(403, "ROLE_NOT_ALLOWED");
  }

  /** Branches must be in the actor's institute; a branch admin may only use their own branch. */
  private async assertBranchesAllowed(actor: AuthUser, home: string, extra: string[]): Promise<void> {
    const ids = [...new Set([home, ...extra])];
    const scope = scopeWhere(actor, "users.manage");
    if (scope.branchId && ids.some((b) => b !== scope.branchId)) throw new ApiHttpException(403, "FORBIDDEN");
    const found = await this.prisma.db.branch.count({ where: { id: { in: ids }, instituteId: actor.instituteId } });
    if (found !== ids.length) {
      throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "branchId", rule: "unknown_branch" }] });
    }
  }

  private async assertNotLastSuperadmin(target: AppUser): Promise<void> {
    const others = await this.prisma.db.appUser.count({
      where: { instituteId: target.instituteId, role: "superadmin", status: "active", id: { not: target.id } },
    });
    if (others === 0) throw new ApiHttpException(409, "LAST_SUPERADMIN");
  }

  /** Friendly 409 naming the field, checked before writing. Login IDs are unique system-wide (DN-026). */
  private async assertUnique(
    fields: { employeeCode?: string | undefined; email?: string | undefined; phone?: string | null | undefined },
    exceptId?: string,
  ): Promise<void> {
    for (const [key, value] of Object.entries(fields)) {
      if (!value) continue;
      const clash = await this.prisma.db.appUser.findFirst({
        where: { [key]: key === "employeeCode" || key === "email" ? { equals: value, mode: "insensitive" } : value, ...(exceptId && { id: { not: exceptId } }) },
        select: { id: true },
      });
      if (clash) throw new ApiHttpException(409, "ALREADY_EXISTS", { field: key });
    }
  }

  /** Two admins creating the same email at once: the database's unique index decides; answer 409. */
  private async withUniqueCheck<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiHttpException(409, "ALREADY_EXISTS");
      }
      throw err;
    }
  }

  private async revokeSessions(userId: string): Promise<void> {
    await this.prisma.db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}

function extraOnly(home: string, extra: string[]): string[] {
  return [...new Set(extra)].filter((id) => id !== home);
}
