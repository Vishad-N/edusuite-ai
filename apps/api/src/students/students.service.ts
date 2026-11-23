import { Injectable } from "@nestjs/common";
import {
  MAX_RECEIPT_BACKDATE_DAYS,
  daysBetween,
  decodeCursor,
  encodeCursor,
  financialYear,
  istDate,
  type FeeReceipt,
  type FeeReceiptCreate,
  type FeeReceiptListQuery,
  type Page,
  type Student,
  type StudentCreate,
  type StudentListQuery,
  type StudentUpdate,
} from "@edusuite/shared";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "../auth/authUser";
import { scopeWhere } from "../auth/scope";

type Ctx = { ip?: string | undefined };
type Tx = Prisma.TransactionClient;

const PHOTO_MIMES = ["image/png", "image/jpeg", "image/webp"];
const isAdmin = (actor: AuthUser) => actor.role === "superadmin" || actor.role === "branch_admin";
const num = (d: Prisma.Decimal | number) => Number(d);
const badCursor = () => new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "cursor", rule: "invalid" }] });

type StudentRow = Prisma.StudentGetPayload<object>;
const receiptInclude = {
  student: { select: { rollNo: true, fullName: true, course: true, batch: true } },
  issuedBy: { select: { id: true, displayName: true } },
} as const;
type ReceiptRow = Prisma.FeeReceiptGetPayload<{ include: typeof receiptInclude }>;

/**
 * Students, fees and receipts (plan §06–07 STUDENTS / FEES, Phase 5; DN-061).
 * Scope: students.fees (super admin institute-wide; branch admin and counselor
 * their own branch). Money rules are in packages/shared/src/students.ts.
 */
@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- students ----------

  async list(actor: AuthUser, query: StudentListQuery): Promise<Page<Student>> {
    const scope = scopeWhere(actor, "students.fees");
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    if (cursor === null) throw badCursor();
    const and: Prisma.StudentWhereInput[] = [scope];
    if (query.status) and.push({ status: query.status });
    if (query.q) {
      const q = query.q;
      and.push({
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { rollNo: { contains: q, mode: "insensitive" } },
          { phone: { contains: q.replace(/\D/g, "") || q } },
          { guardianName: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (cursor) and.push({ OR: [{ updatedAt: { lt: cursor.updatedAt } }, { updatedAt: cursor.updatedAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.db.student.findMany({ where: { AND: and }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: query.limit + 1 });
    const page = rows.slice(0, query.limit);
    const paid = await this.paidFor(page.map((r) => r.id));
    const last = page.at(-1);
    return { items: page.map((r) => this.toStudent(r, paid.get(r.id) ?? 0)), nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null };
  }

  async get(actor: AuthUser, id: string): Promise<Student> {
    const row = await this.loadStudent(actor, id);
    return this.toStudent(row, (await this.paidFor([id])).get(id) ?? 0);
  }

  /** The next free roll number for the caller's branch this year, e.g. DEMO-MAIN-2026-0007. */
  async nextRollNo(actor: AuthUser): Promise<{ rollNo: string }> {
    scopeWhere(actor, "students.fees");
    return { rollNo: await this.suggestRollNo(this.prisma.db, actor) };
  }

  async create(actor: AuthUser, input: StudentCreate, ctx: Ctx): Promise<Student> {
    scopeWhere(actor, "students.fees");
    if (input.photoFileId) await this.assertPhoto(actor, input.photoFileId);
    const data = {
      instituteId: actor.instituteId,
      branchId: actor.branchId,
      fullName: input.fullName,
      guardianName: input.guardianName ?? null,
      phone: input.phone ?? null,
      course: input.course,
      batch: input.batch ?? null,
      totalFee: new Prisma.Decimal(input.totalFee),
      photoFileId: input.photoFileId ?? null,
    };
    let row: StudentRow | null = null;
    // A typed roll number that's taken is a 409; a generated one retries (another desk may have taken it).
    for (let attempt = 0; !row; attempt++) {
      const rollNo = input.rollNo ?? (await this.suggestRollNo(this.prisma.db, actor));
      try {
        row = await this.prisma.db.student.create({ data: { ...data, rollNo } });
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
        if (input.rollNo || attempt >= 4) throw new ApiHttpException(409, "ALREADY_EXISTS", { field: "rollNo" });
      }
    }
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "student.create",
      entityType: "student",
      entityId: row.id,
      meta: { rollNo: row.rollNo, totalFee: input.totalFee },
      ip: ctx.ip,
    });
    return this.toStudent(row, 0);
  }

  async update(actor: AuthUser, id: string, input: StudentUpdate, ctx: Ctx): Promise<Student> {
    const current = await this.loadStudent(actor, id);
    if (input.photoFileId) await this.assertPhoto(actor, input.photoFileId);
    const feeChanged = input.totalFee !== undefined && input.totalFee !== num(current.totalFee);
    if (feeChanged && !isAdmin(actor)) throw new ApiHttpException(403, "FEE_CHANGE_NOT_ALLOWED");

    const row = await this.prisma.db.$transaction(async (tx) => {
      if (feeChanged) {
        // Lock the student so a receipt can't land between the check and the update.
        await tx.$queryRaw`SELECT id FROM students WHERE id = ${id}::uuid FOR UPDATE`;
        const paid = await this.paidIn(tx, id);
        if (input.totalFee! < paid) throw new ApiHttpException(409, "FEE_BELOW_PAID");
      }
      try {
        return await tx.student.update({
          where: { id },
          data: {
            ...(input.rollNo !== undefined && { rollNo: input.rollNo }),
            ...(input.fullName !== undefined && { fullName: input.fullName }),
            ...(input.guardianName !== undefined && { guardianName: input.guardianName }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.course !== undefined && { course: input.course }),
            ...(input.batch !== undefined && { batch: input.batch }),
            ...(input.photoFileId !== undefined && { photoFileId: input.photoFileId }),
            ...(input.status !== undefined && { status: input.status }),
            ...(feeChanged && { totalFee: new Prisma.Decimal(input.totalFee!) }),
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new ApiHttpException(409, "ALREADY_EXISTS", { field: "rollNo" });
        throw err;
      }
    });
    await this.audit.log({
      instituteId: actor.instituteId,
      actorId: actor.userId,
      action: "student.update",
      entityType: "student",
      entityId: id,
      meta: { fields: Object.keys(input).join(","), ...(feeChanged && { totalFeeFrom: num(current.totalFee), totalFeeTo: input.totalFee }) },
      ip: ctx.ip,
    });
    return this.toStudent(row, (await this.paidFor([id])).get(id) ?? 0);
  }

  // ---------- receipts ----------

  async listReceipts(actor: AuthUser, query: FeeReceiptListQuery): Promise<Page<FeeReceipt>> {
    const scope = scopeWhere(actor, "students.fees");
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    if (cursor === null) throw badCursor();
    const and: Prisma.FeeReceiptWhereInput[] = [scope];
    if (query.studentId) and.push({ studentId: query.studentId });
    if (cursor) and.push({ OR: [{ createdAt: { lt: cursor.updatedAt } }, { createdAt: cursor.updatedAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.db.feeReceipt.findMany({
      where: { AND: and },
      include: receiptInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map((r) => this.toReceipt(r, null)),
      nextCursor: rows.length > query.limit && last ? encodeCursor({ updatedAt: last.createdAt, id: last.id }) : null,
    };
  }

  /**
   * Issues a receipt (plan §06): one transaction locks the student (balance check)
   * and the branch's counter row for this financial year (gap-free numbering).
   * The same Idempotency-Key returns the same receipt and creates nothing.
   */
  async issue(actor: AuthUser, input: FeeReceiptCreate, idempotencyKey: string, ctx: Ctx): Promise<{ receipt: FeeReceipt; created: boolean }> {
    const scope = scopeWhere(actor, "students.fees");
    const existing = await this.prisma.db.feeReceipt.findUnique({
      where: { instituteId_idempotencyKey: { instituteId: actor.instituteId, idempotencyKey } },
      include: receiptInclude,
    });
    if (existing) {
      if (existing.issuedById !== actor.userId || existing.studentId !== input.studentId || num(existing.amount) !== input.amount) {
        throw new ApiHttpException(409, "CONFLICT");
      }
      return { receipt: this.toReceipt(existing, null), created: false };
    }

    const today = istDate();
    const paidOn = input.paidOn ?? today;
    const back = daysBetween(paidOn, today);
    if (back < 0 || back > MAX_RECEIPT_BACKDATE_DAYS) throw new ApiHttpException(400, "RECEIPT_DATE_INVALID");

    try {
      const { row, dueAfter } = await this.prisma.db.$transaction(async (tx) => {
        const student = await tx.student.findFirst({ where: { id: input.studentId, ...scope }, include: { branch: true, institute: true } });
        if (!student) throw new ApiHttpException(404, "NOT_FOUND");
        await tx.$queryRaw`SELECT id FROM students WHERE id = ${student.id}::uuid FOR UPDATE`;
        const due = num(student.totalFee) - (await this.paidIn(tx, student.id));
        if (Math.round(input.amount * 100) > Math.round(due * 100)) throw new ApiHttpException(400, "RECEIPT_OVER_BALANCE", { due });

        // Numbering follows the student's branch and the receipt date's financial year.
        const fy = financialYear(paidOn);
        await tx.$executeRaw`INSERT INTO receipt_counters (branch_id, financial_year, last_seq) VALUES (${student.branchId}::uuid, ${fy}, 0) ON CONFLICT DO NOTHING`;
        const [counter] = await tx.$queryRaw<Array<{ last_seq: number }>>`
          UPDATE receipt_counters SET last_seq = last_seq + 1
          WHERE branch_id = ${student.branchId}::uuid AND financial_year = ${fy}
          RETURNING last_seq`;
        const receiptNo = `${student.institute.code}-${student.branch.code}/${fy}/${String(counter!.last_seq).padStart(6, "0")}`;

        const created = await tx.feeReceipt.create({
          data: {
            instituteId: actor.instituteId,
            branchId: student.branchId,
            studentId: student.id,
            receiptNo,
            amount: new Prisma.Decimal(input.amount),
            mode: input.mode,
            paidOn: new Date(`${paidOn}T00:00:00Z`),
            issuedById: actor.userId,
            idempotencyKey,
          },
          include: receiptInclude,
        });
        await tx.auditLog.create({
          data: {
            instituteId: actor.instituteId,
            actorId: actor.userId,
            action: "receipt.issue",
            entityType: "fee_receipt",
            entityId: created.id,
            meta: { receiptNo, amount: input.amount, mode: input.mode, paidOn, studentId: student.id },
            ip: ctx.ip ?? null,
          },
        });
        return { row: created, dueAfter: due - input.amount };
      });
      return { receipt: this.toReceipt(row, Math.round(dueAfter * 100) / 100), created: true };
    } catch (err) {
      // Two requests with the same key at once: the loser returns the winner's receipt.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const winner = await this.prisma.db.feeReceipt.findUnique({
          where: { instituteId_idempotencyKey: { instituteId: actor.instituteId, idempotencyKey } },
          include: receiptInclude,
        });
        if (winner) return { receipt: this.toReceipt(winner, null), created: false };
      }
      throw err;
    }
  }

  /** Admins only (receipts.cancel); the receipt stays, marked cancelled with the reason, and its number is never reused. */
  async cancel(actor: AuthUser, id: string, reason: string, ctx: Ctx): Promise<FeeReceipt> {
    const scope = scopeWhere(actor, "receipts.cancel");
    const row = await this.prisma.db.$transaction(async (tx) => {
      const found = await tx.feeReceipt.findFirst({ where: { id, ...scope } });
      if (!found) throw new ApiHttpException(404, "NOT_FOUND");
      const res = await tx.feeReceipt.updateMany({
        where: { id, status: "issued" },
        data: { status: "cancelled", cancelReason: reason, cancelledById: actor.userId, cancelledAt: new Date() },
      });
      if (res.count === 0) throw new ApiHttpException(409, "RECEIPT_ALREADY_CANCELLED");
      await tx.auditLog.create({
        data: {
          instituteId: actor.instituteId,
          actorId: actor.userId,
          action: "receipt.cancel",
          entityType: "fee_receipt",
          entityId: id,
          meta: { receiptNo: found.receiptNo, amount: num(found.amount), reason },
          ip: ctx.ip ?? null,
        },
      });
      return tx.feeReceipt.findUniqueOrThrow({ where: { id }, include: receiptInclude });
    });
    return this.toReceipt(row, null);
  }

  // ---------- helpers ----------

  private async loadStudent(actor: AuthUser, id: string): Promise<StudentRow> {
    const row = await this.prisma.db.student.findFirst({ where: { id, ...scopeWhere(actor, "students.fees") } });
    if (!row) throw new ApiHttpException(404, "NOT_FOUND");
    return row;
  }

  private async assertPhoto(actor: AuthUser, fileId: string): Promise<void> {
    const f = await this.prisma.db.file.findFirst({ where: { id: fileId, instituteId: actor.instituteId, uploadedAt: { not: null }, mime: { in: PHOTO_MIMES } } });
    if (!f) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: "photoFileId", rule: "invalid" }] });
  }

  private async suggestRollNo(db: Tx, actor: AuthUser): Promise<string> {
    const branch = await db.branch.findUniqueOrThrow({ where: { id: actor.branchId }, include: { institute: { select: { code: true } } } });
    const prefix = `${branch.institute.code}-${branch.code}-${istDate().slice(0, 4)}-`.toUpperCase();
    const taken = await db.student.findMany({ where: { instituteId: actor.instituteId, rollNo: { startsWith: prefix } }, select: { rollNo: true } });
    const max = taken.reduce((m, s) => Math.max(m, Number(s.rollNo.slice(prefix.length)) || 0), 0);
    return `${prefix}${String(max + 1).padStart(4, "0")}`;
  }

  private async paidIn(tx: Tx, studentId: string): Promise<number> {
    const agg = await tx.feeReceipt.aggregate({ where: { studentId, status: "issued" }, _sum: { amount: true } });
    return num(agg._sum.amount ?? 0);
  }

  private async paidFor(ids: string[]): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const groups = await this.prisma.db.feeReceipt.groupBy({ by: ["studentId"], where: { studentId: { in: ids }, status: "issued" }, _sum: { amount: true } });
    return new Map(groups.map((g) => [g.studentId, num(g._sum.amount ?? 0)]));
  }

  private toStudent(r: StudentRow, paid: number): Student {
    const totalFee = num(r.totalFee);
    return {
      id: r.id,
      branchId: r.branchId,
      rollNo: r.rollNo,
      fullName: r.fullName,
      guardianName: r.guardianName,
      phone: r.phone,
      course: r.course,
      batch: r.batch,
      photoFileId: r.photoFileId,
      totalFee,
      paid,
      due: Math.round((totalFee - paid) * 100) / 100,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private toReceipt(r: ReceiptRow, dueAfter: number | null): FeeReceipt {
    return {
      id: r.id,
      receiptNo: r.receiptNo,
      studentId: r.studentId,
      student: r.student,
      amount: num(r.amount),
      mode: r.mode,
      paidOn: r.paidOn.toISOString().slice(0, 10),
      status: r.status,
      issuedBy: r.issuedBy,
      cancelReason: r.cancelReason,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      dueAfter,
    };
  }
}
