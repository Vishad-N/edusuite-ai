import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  DocumentCreateSchema,
  DocumentListQuerySchema,
  DocumentUpdateSchema,
  type DocumentCreate,
  type DocumentListQuery,
  type DocumentSummary,
  type DocumentUpdate,
  type Page,
} from "@edusuite/shared";
import { ZodBody } from "../common/zodBody";
import { AnySignedIn, CurrentUser, type AuthUser } from "../auth/authUser";
import { DocumentsService } from "./documents.service";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/**
 * Plan §07 DOCUMENTS. The permission depends on the document's type, so the
 * route needs any signed-in user and DocumentsService checks the type's
 * permission (DOCUMENT_PERMISSIONS) on every call.
 */
@Controller("documents")
@AnySignedIn()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser, @Query(new ZodBody(DocumentListQuerySchema)) query: DocumentListQuery): Promise<Page<DocumentSummary>> {
    return this.documents.list(actor, query);
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body(new ZodBody(DocumentCreateSchema)) body: DocumentCreate, @Req() req: FastifyRequest) {
    return this.documents.create(actor, body, { ip: req.ip });
  }

  @Get(":id")
  get(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string) {
    return this.documents.get(actor, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() actor: AuthUser,
    @Param("id", uuid) id: string,
    @Body(new ZodBody(DocumentUpdateSchema)) body: DocumentUpdate,
    @Req() req: FastifyRequest,
  ) {
    return this.documents.update(actor, id, body, { ip: req.ip });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Req() req: FastifyRequest): Promise<void> {
    await this.documents.remove(actor, id, { ip: req.ip });
  }
}
