import { Injectable } from "@nestjs/common";
import {
  BrandingSchema,
  LOGO_MAX_BYTES,
  LOGO_MIMES,
  type Branch,
  type BranchCreate,
  type BranchUpdate,
  type Institute,
  type InstituteUpdate,
} from "@edusuite/shared";
import { Prisma } from "../generated/prisma/client";
import type { Branch as BranchRow, Institute as InstituteRow } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "../auth/authUser";
import { assertSameInstitute, scopeWhere } from "../auth/scope";

type Ctx = { ip?: string | undefined };

function toInstitute(row: InstituteRow): Institute {
  // Older or hand-edited rows may hold extra keys; keep only the known branding fields.
  const branding = BrandingSchema.safeParse(row.branding);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    branding: branding.success ? branding.data : {},
    aiMonthlyTokenQuota: row.aiMonthlyTokenQuota,
  };
}

function toBranch(row: BranchRow): Branch {
  return { id: row.id, code: row.code, name: row.name, city: row.city };
}

/**
 * Plan §07 INSTITUTES and the "Institute and branch settings" row of §09:
 * a super admin edits the institute and all its branches; a branch admin
 * edits only their own branch. Every signed-in user may read their own
 * institute and its branch list (for the header and login picker).
 */
@Injectable()
export class InstitutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Users belong to exactly one institute, so this list has one entry. */
  async list(actor: AuthUser): Promise<Institute[]> {
    const row = await this.prisma.db.institute.findUnique({ where: { id: actor.instituteId } });
    return row ? [toInstitute(row)] : [];
  }

  async get(actor: AuthUser, id: string): Promise<Institute> {
    assertSameInstitute(actor, { instituteId: id });
    const row = await this.prisma.db.institute.findUnique({ where: { id } });
    if (!row) throw new ApiHttpException(404, "NOT_FOUND");
    return toInstitute(row);
  }

  async update(actor: AuthUser, id: string, input: InstituteUpdate, ctx: Ctx): Promise<Institute> {
    assertSameInstitute(actor, { instituteId: id });
    if (scopeWhere(actor, "institute.settings").branchId) throw new ApiHttpException(403, "FORBIDDEN");

    // The logo must be this institute's finished image upload, small enough to embed (DN-071).
    const logoId = input.branding?.logoFileId;
    if (logoId) {
      const file = await this.prisma.db.file.findFirst({ where: { id: logoId, instituteId: id, uploadedAt: { not: null } } });
      if (!file || !(LOGO_MIMES as readonly string[]).includes(file.mime) || file.bytes > LOGO_MAX_BYTES) {
        throw new ApiHttpException(400, "LOGO_INVALID");
      }
    }

    const row = await this.prisma.db.institute.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.branding !== undefined && { branding: input.branding }),
      },
    });
    await this.audit.log({
      instituteId: id,
      actorId: actor.userId,
      action: "institute.update",
      entityType: "institute",
      entityId: id,
      meta: { fields: Object.keys(input).sort().join(",") },
      ip: ctx.ip,
    });
    return toInstitute(row);
  }

  async listBranches(actor: AuthUser, instituteId: string): Promise<Branch[]> {
    assertSameInstitute(actor, { instituteId });
    const rows = await this.prisma.db.branch.findMany({ where: { instituteId }, orderBy: { code: "asc" } });
    return rows.map(toBranch);
  }

  async createBranch(actor: AuthUser, instituteId: string, input: BranchCreate, ctx: Ctx): Promise<Branch> {
    assertSameInstitute(actor, { instituteId });
    if (scopeWhere(actor, "institute.settings").branchId) throw new ApiHttpException(403, "FORBIDDEN");
    try {
      const row = await this.prisma.db.branch.create({
        data: { instituteId, code: input.code, name: input.name, city: input.city ?? null },
      });
      await this.audit.log({
        instituteId,
        actorId: actor.userId,
        action: "branch.create",
        entityType: "branch",
        entityId: row.id,
        meta: { code: row.code },
        ip: ctx.ip,
      });
      return toBranch(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiHttpException(409, "ALREADY_EXISTS", { field: "code" });
      }
      throw err;
    }
  }

  async updateBranch(actor: AuthUser, instituteId: string, branchId: string, input: BranchUpdate, ctx: Ctx): Promise<Branch> {
    assertSameInstitute(actor, { instituteId });
    const scope = scopeWhere(actor, "institute.settings");
    const existing = await this.prisma.db.branch.findFirst({ where: { id: branchId, instituteId } });
    // A branch admin may edit only the branch they are working at.
    if (!existing || (scope.branchId && scope.branchId !== branchId)) throw new ApiHttpException(404, "NOT_FOUND");

    const row = await this.prisma.db.branch.update({
      where: { id: branchId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.city !== undefined && { city: input.city }),
      },
    });
    await this.audit.log({
      instituteId,
      actorId: actor.userId,
      action: "branch.update",
      entityType: "branch",
      entityId: branchId,
      meta: { fields: Object.keys(input).sort().join(",") },
      ip: ctx.ip,
    });
    return toBranch(row);
  }
}
