import { Injectable } from "@nestjs/common";
import {
  QUESTION_LETTERS,
  decodeCursor,
  encodeCursor,
  type BankQuestion,
  type Page,
  type QuestionBulkResult,
  type QuestionLetter,
  type QuestionListQuery,
  type QuestionSubjects,
} from "@edusuite/shared";
import type { z } from "zod";
import type { QuestionInputSchema } from "@edusuite/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "../auth/authUser";

type Ctx = { ip?: string | undefined };
type ParsedQuestion = z.output<typeof QuestionInputSchema>;

const select = {
  id: true,
  subject: true,
  topic: true,
  bodyHi: true,
  bodyEn: true,
  options: true,
  answer: true,
  trick: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, displayName: true } },
} as const;

type Row = Prisma.QuestionGetPayload<{ select: typeof select }>;

function toQuestion(r: Row): BankQuestion {
  const o = (r.options ?? {}) as Record<string, unknown>;
  const options = Object.fromEntries(QUESTION_LETTERS.map((l) => [l, typeof o[l] === "string" ? o[l] : ""])) as Record<QuestionLetter, string>;
  return {
    id: r.id,
    subject: r.subject,
    topic: r.topic,
    bodyHi: r.bodyHi,
    bodyEn: r.bodyEn,
    options,
    answer: (QUESTION_LETTERS as readonly string[]).includes(r.answer) ? (r.answer as QuestionLetter) : "A",
    trick: r.trick,
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
  };
}

/**
 * The question bank (plan §06; DN-074). One bank per institute, shared by everyone who
 * makes AI content there. Questions are added in bulk from papers and MCQ sets; an exact
 * repeat (same subject and text) is skipped, so the bank doesn't fill with copies.
 */
@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: QuestionListQuery): Promise<Page<BankQuestion>> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    if (cursor === null) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "cursor", rule: "invalid" }] });

    const and: Prisma.QuestionWhereInput[] = [{ instituteId: actor.instituteId }];
    if (query.subject) and.push({ subject: { equals: query.subject, mode: "insensitive" } });
    if (query.topic) and.push({ topic: { contains: query.topic, mode: "insensitive" } });
    if (query.mine) and.push({ createdById: actor.userId });
    if (query.q) {
      and.push({
        OR: [
          { bodyHi: { contains: query.q, mode: "insensitive" } },
          { bodyEn: { contains: query.q, mode: "insensitive" } },
          { topic: { contains: query.q, mode: "insensitive" } },
        ],
      });
    }
    if (cursor) and.push({ OR: [{ updatedAt: { lt: cursor.updatedAt } }, { updatedAt: cursor.updatedAt, id: { lt: cursor.id } }] });

    const rows = await this.prisma.db.question.findMany({
      where: { AND: and },
      select,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return { items: page.map(toQuestion), nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null };
  }

  async subjects(actor: AuthUser): Promise<QuestionSubjects> {
    const groups = await this.prisma.db.question.groupBy({
      by: ["subject"],
      where: { instituteId: actor.instituteId },
      _count: { _all: true },
      orderBy: { subject: "asc" },
    });
    return groups.map((g) => ({ subject: g.subject, count: g._count._all }));
  }

  async bulkCreate(actor: AuthUser, questions: ParsedQuestion[], ctx: Ctx): Promise<QuestionBulkResult> {
    const key = (q: { subject: string; bodyHi: string }) => `${q.subject.toLowerCase()}\u0000${q.bodyHi}`;
    // Repeats inside the batch first.
    const unique = [...new Map(questions.map((q) => [key(q), q])).values()];
    const existing = await this.prisma.db.question.findMany({
      where: { instituteId: actor.instituteId, OR: unique.map((q) => ({ subject: { equals: q.subject, mode: "insensitive" as const }, bodyHi: q.bodyHi })) },
      select: { subject: true, bodyHi: true },
    });
    const seen = new Set(existing.map(key));
    const fresh = unique.filter((q) => !seen.has(key(q)));

    if (fresh.length > 0) {
      await this.prisma.db.question.createMany({
        data: fresh.map((q) => ({
          instituteId: actor.instituteId,
          createdById: actor.userId,
          subject: q.subject,
          topic: q.topic ?? null,
          bodyHi: q.bodyHi,
          bodyEn: q.bodyEn ?? null,
          options: q.options,
          answer: q.answer,
          trick: q.trick ?? null,
        })),
      });
    }
    const result = { added: fresh.length, skipped: questions.length - fresh.length };
    await this.audit.log({ instituteId: actor.instituteId, actorId: actor.userId, action: "question.bulk_add", meta: result, ip: ctx.ip });
    return result;
  }

  /** The person who added it, or an admin, may remove a question. */
  async remove(actor: AuthUser, id: string, ctx: Ctx): Promise<void> {
    const row = await this.prisma.db.question.findFirst({ where: { id, instituteId: actor.instituteId }, select: { id: true, createdById: true } });
    if (!row) throw new ApiHttpException(404, "NOT_FOUND");
    const admin = actor.role === "superadmin" || actor.role === "branch_admin";
    if (!admin && row.createdById !== actor.userId) throw new ApiHttpException(403, "FORBIDDEN");
    await this.prisma.db.question.delete({ where: { id } });
    await this.audit.log({ instituteId: actor.instituteId, actorId: actor.userId, action: "question.delete", entityType: "question", entityId: id, ip: ctx.ip });
  }
}
