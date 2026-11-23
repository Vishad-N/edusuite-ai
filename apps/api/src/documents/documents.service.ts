import { Injectable } from "@nestjs/common";
import {
  DOCUMENT_PERMISSIONS,
  DOCUMENT_SCHEMA_VERSIONS,
  MAX_DOCUMENT_BYTES,
  can,
  decodeCursor,
  encodeCursor,
  parseDocumentContent,
  type DocumentCreate,
  type DocumentListQuery,
  type DocumentSummary,
  type DocumentType,
  type DocumentUpdate,
  type Page,
} from "@edusuite/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "../auth/authUser";
import { scopeWhere } from "../auth/scope";

type Ctx = { ip?: string | undefined };
type FullDocument = DocumentSummary & { content: unknown };

export const summarySelect = {
  id: true,
  type: true,
  title: true,
  branchId: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, displayName: true } },
} as const;

export type SummaryRow = {
  id: string;
  type: DocumentType;
  title: string;
  branchId: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; displayName: string };
};

export function toSummary(row: SummaryRow): DocumentSummary {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    branchId: row.branchId,
    createdBy: row.createdBy,
    schemaVersion: row.schemaVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Saved work from the tool screens (plan §07 DOCUMENTS, DN-038).
 * - Each type needs the permission of the screen that makes it.
 * - Super admins see the whole institute; everyone else sees their branch.
 * - The creator, a super admin or a branch admin may edit or delete.
 * - Updates must name the version they replace (no silent overwrites).
 * - Delete is soft (DN-014) and audited.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: DocumentListQuery): Promise<Page<DocumentSummary>> {
    const scope = this.scopeFor(actor, query.type);
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    if (cursor === null) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "cursor", rule: "invalid" }] });

    const and: Prisma.DocumentWhereInput[] = [{ ...scope, type: query.type, deletedAt: null }];
    if (query.mine) and.push({ createdById: actor.userId });
    if (query.q) and.push({ title: { contains: query.q, mode: "insensitive" } });
    if (cursor) {
      and.push({ OR: [{ updatedAt: { lt: cursor.updatedAt } }, { updatedAt: cursor.updatedAt, id: { lt: cursor.id } }] });
    }

    const rows = await this.prisma.db.document.findMany({
      where: { AND: and },
      select: summarySelect,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map((r) => toSummary(r as SummaryRow)),
      nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null,
    };
  }

  async get(actor: AuthUser, id: string): Promise<FullDocument> {
    const row = await this.loadVisible(actor, id);
    return { ...toSummary(row), content: row.content };
  }

  async create(actor: AuthUser, input: DocumentCreate, ctx: Ctx): Promise<FullDocument> {
    this.scopeFor(actor, input.type);
    const content = this.validContent(input.type, input.content);
    const row = await this.prisma.db.document.create({
      data: {
        instituteId: actor.instituteId,
        branchId: actor.branchId,
        createdById: actor.userId,
        type: input.type,
        title: input.title,
        content: content as Prisma.InputJsonValue,
        schemaVersion: DOCUMENT_SCHEMA_VERSIONS[input.type],
      },
      select: { ...summarySelect, content: true },
    });
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "document.create",
      entityType: "document",
      entityId: row.id,
      meta: { type: row.type },
      ip: ctx.ip,
    });
    return { ...toSummary(row as SummaryRow), content: row.content };
  }

  async update(actor: AuthUser, id: string, input: DocumentUpdate, ctx: Ctx): Promise<FullDocument> {
    const existing = await this.loadVisible(actor, id);
    this.assertMayChange(actor, existing);
    const content = input.content === undefined ? undefined : this.validContent(existing.type, input.content);

    const db = this.prisma.db;
    // Only succeeds if nobody saved since the version the client had (compare-and-set).
    const { count } = await db.document.updateMany({
      where: { id, deletedAt: null, updatedAt: new Date(input.expectedUpdatedAt) },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(content !== undefined && {
          content: content as Prisma.InputJsonValue,
          schemaVersion: DOCUMENT_SCHEMA_VERSIONS[existing.type],
        }),
      },
    });
    if (count !== 1) {
      throw new ApiHttpException(409, "DOCUMENT_CHANGED", { updatedAt: existing.updatedAt.toISOString() });
    }
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "document.update",
      entityType: "document",
      entityId: id,
      meta: { fields: [input.title !== undefined && "title", content !== undefined && "content"].filter(Boolean).join(",") },
      ip: ctx.ip,
    });
    return this.get(actor, id);
  }

  async remove(actor: AuthUser, id: string, ctx: Ctx): Promise<void> {
    const existing = await this.loadVisible(actor, id);
    this.assertMayChange(actor, existing);
    await this.prisma.db.document.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "document.delete",
      entityType: "document",
      entityId: id,
      meta: { type: existing.type },
      ip: ctx.ip,
    });
  }

  /** The where-clause for a type the actor may use; 403 if their role can't use it at all. */
  private scopeFor(actor: AuthUser, type: DocumentType) {
    const permission = DOCUMENT_PERMISSIONS[type];
    if (!can(actor.role, permission)) throw new ApiHttpException(403, "FORBIDDEN");
    return scopeWhere(actor, permission);
  }

  /** Loads a live document the actor may see; anything else is 404 (no probing other branches or institutes). */
  private async loadVisible(actor: AuthUser, id: string) {
    const row = await this.prisma.db.document.findFirst({
      where: { id, instituteId: actor.instituteId, deletedAt: null },
      select: { ...summarySelect, content: true, createdById: true },
    });
    if (!row) throw new ApiHttpException(404, "NOT_FOUND");
    const type = row.type as DocumentType;
    if (!can(actor.role, DOCUMENT_PERMISSIONS[type])) throw new ApiHttpException(404, "NOT_FOUND");
    const scope = scopeWhere(actor, DOCUMENT_PERMISSIONS[type]);
    if (scope.branchId && row.branchId !== scope.branchId) throw new ApiHttpException(404, "NOT_FOUND");
    return { ...row, type };
  }

  /** The creator, a super admin or a branch admin may change a document. */
  private assertMayChange(actor: AuthUser, doc: { createdById: string }): void {
    const admin = actor.role === "superadmin" || actor.role === "branch_admin";
    if (!admin && doc.createdById !== actor.userId) throw new ApiHttpException(403, "FORBIDDEN");
  }

  private validContent(type: DocumentType, content: unknown): unknown {
    if (Buffer.byteLength(JSON.stringify(content ?? null), "utf8") > MAX_DOCUMENT_BYTES) {
      throw new ApiHttpException(413, "DOCUMENT_TOO_LARGE");
    }
    const parsed = parseDocumentContent(type, content);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => ({ path: ["content", ...i.path].join("."), rule: i.code }));
      throw new ApiHttpException(400, "VALIDATION_FAILED", { fields });
    }
    return parsed.data;
  }
}
