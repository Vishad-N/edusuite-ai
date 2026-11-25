import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  QuestionBulkCreateSchema,
  QuestionListQuerySchema,
  type BankQuestion,
  type Page,
  type QuestionBulkResult,
  type QuestionListQuery,
  type QuestionSubjects,
} from "@edusuite/shared";
import type { z } from "zod";
import { ZodBody } from "../common/zodBody";
import { CurrentUser, RequirePermission, type AuthUser } from "../auth/authUser";
import { QuestionsService } from "./questions.service";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** The institute's question bank (plan §06; DN-074), for everyone who makes AI content. */
@Controller("questions")
@RequirePermission("ai.content")
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser, @Query(new ZodBody(QuestionListQuerySchema)) query: QuestionListQuery): Promise<Page<BankQuestion>> {
    return this.questions.list(actor, query);
  }

  @Get("subjects")
  subjects(@CurrentUser() actor: AuthUser): Promise<QuestionSubjects> {
    return this.questions.subjects(actor);
  }

  @Post("bulk")
  @HttpCode(200)
  bulk(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodBody(QuestionBulkCreateSchema)) body: z.output<typeof QuestionBulkCreateSchema>,
    @Req() req: FastifyRequest,
  ): Promise<QuestionBulkResult> {
    return this.questions.bulkCreate(actor, body.questions, { ip: req.ip });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Req() req: FastifyRequest): Promise<void> {
    await this.questions.remove(actor, id, { ip: req.ip });
  }
}
