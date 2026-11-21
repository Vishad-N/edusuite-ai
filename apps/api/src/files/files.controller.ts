import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { FilePresignRequestSchema, type FileInfo, type FilePresignRequest, type FilePresignResponse, type FileUrl } from "@edusuite/shared";
import { ZodBody } from "../common/zodBody";
import { AnySignedIn, CurrentUser, type AuthUser } from "../auth/authUser";
import { FilesService } from "./files.service";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** Plan §07 FILES, plus `complete` (verify the upload) and `url` (link as JSON). */
@Controller("files")
@AnySignedIn()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("presign")
  @HttpCode(200)
  presign(@CurrentUser() actor: AuthUser, @Body(new ZodBody(FilePresignRequestSchema)) body: FilePresignRequest): Promise<FilePresignResponse> {
    return this.files.presign(actor, body);
  }

  @Post(":id/complete")
  @HttpCode(200)
  complete(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string): Promise<FileInfo> {
    return this.files.complete(actor, id);
  }

  @Get(":id/url")
  url(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string): Promise<FileUrl> {
    return this.files.url(actor, id);
  }

  /** Plan §07: GET /files/:id answers 302 to a short-lived presigned link. */
  @Get(":id")
  async download(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Res() reply: FastifyReply): Promise<void> {
    const { url } = await this.files.url(actor, id);
    void reply.redirect(url, 302);
  }

  @Get(":id/info")
  info(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string): Promise<FileInfo> {
    return this.files.info(actor, id);
  }
}
