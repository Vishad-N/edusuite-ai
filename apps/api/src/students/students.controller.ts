import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  FeeReceiptCancelSchema,
  FeeReceiptCreateSchema,
  FeeReceiptListQuerySchema,
  IDEMPOTENCY_HEADER,
  IdempotencyKeySchema,
  StudentCreateSchema,
  StudentListQuerySchema,
  StudentUpdateSchema,
  type FeeReceiptCancel,
  type FeeReceiptCreate,
  type FeeReceiptListQuery,
  type StudentCreate,
  type StudentListQuery,
  type StudentUpdate,
} from "@edusuite/shared";
import { ZodBody } from "../common/zodBody";
import { ApiHttpException } from "../common/errors";
import { CurrentUser, RequirePermission, type AuthUser } from "../auth/authUser";
import { StudentsService } from "./students.service";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** Plan §07 STUDENTS (Phase 5, DN-061). */
@Controller("students")
@RequirePermission("students.fees")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser, @Query(new ZodBody(StudentListQuerySchema)) query: StudentListQuery) {
    return this.students.list(actor, query);
  }

  @Get("next-roll-no")
  nextRollNo(@CurrentUser() actor: AuthUser) {
    return this.students.nextRollNo(actor);
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body(new ZodBody(StudentCreateSchema)) body: StudentCreate, @Req() req: FastifyRequest) {
    return this.students.create(actor, body, { ip: req.ip });
  }

  @Get(":id")
  get(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string) {
    return this.students.get(actor, id);
  }

  @Patch(":id")
  update(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Body(new ZodBody(StudentUpdateSchema)) body: StudentUpdate, @Req() req: FastifyRequest) {
    return this.students.update(actor, id, body, { ip: req.ip });
  }
}

/** Plan §07 FEES: receipts never repeat a number and are never deleted (DN-013, DN-061). */
@Controller("fee-receipts")
export class FeeReceiptsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @RequirePermission("students.fees")
  list(@CurrentUser() actor: AuthUser, @Query(new ZodBody(FeeReceiptListQuerySchema)) query: FeeReceiptListQuery) {
    return this.students.listReceipts(actor, query);
  }

  /** 201 when issued, 200 when the same Idempotency-Key returns the earlier receipt. */
  @Post()
  @RequirePermission("students.fees")
  async issue(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodBody(FeeReceiptCreateSchema)) body: FeeReceiptCreate,
    @Headers(IDEMPOTENCY_HEADER) key: string | undefined,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const parsed = IdempotencyKeySchema.safeParse(key);
    if (!parsed.success) throw new ApiHttpException(400, "VALIDATION_FAILED", { fields: [{ path: IDEMPOTENCY_HEADER, rule: "required" }] });
    const { receipt, created } = await this.students.issue(actor, body, parsed.data, { ip: req.ip });
    reply.status(created ? 201 : 200);
    return receipt;
  }

  @Post(":id/cancel")
  @RequirePermission("receipts.cancel")
  cancel(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Body(new ZodBody(FeeReceiptCancelSchema)) body: FeeReceiptCancel, @Req() req: FastifyRequest) {
    return this.students.cancel(actor, id, body.reason, { ip: req.ip });
  }
}
