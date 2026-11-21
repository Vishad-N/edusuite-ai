import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  FILE_TYPES,
  cleanFileName,
  matchesSignature,
  type FileInfo,
  type FileMime,
  type FilePresignRequest,
  type FilePresignResponse,
  type FileUrl,
} from "@edusuite/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "../auth/authUser";
import { STORAGE, type Storage } from "./storage";

const UPLOAD_LINK_SECONDS = 10 * 60;
const DOWNLOAD_LINK_SECONDS = 5 * 60;

type FileRow = {
  id: string;
  instituteId: string;
  uploadedById: string;
  bucketKey: string;
  name: string;
  mime: string;
  bytes: number;
  createdAt: Date;
  uploadedAt: Date | null;
};

function toInfo(row: FileRow): FileInfo {
  return {
    id: row.id,
    name: row.name,
    mime: row.mime as FileMime,
    bytes: row.bytes,
    uploadedAt: row.uploadedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Uploads go straight from the app to storage through short-lived presigned
 * links (plan §05). The API signs only allowed types and sizes, keys files
 * randomly under the institute, and after the upload checks the real size and
 * the file signature before the file can be used (AGENT_README §8, DN-040).
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  async presign(actor: AuthUser, input: FilePresignRequest): Promise<FilePresignResponse> {
    if (!this.storage.configured) throw new ApiHttpException(503, "SERVICE_UNAVAILABLE");
    const id = randomUUID();
    // Random key, never derived from the file name; the institute prefix keeps tenants apart in the bucket.
    const bucketKey = `${actor.instituteId}/${id}.${FILE_TYPES[input.mime].extension}`;
    await this.prisma.db.file.create({
      data: {
        id,
        instituteId: actor.instituteId,
        uploadedById: actor.userId,
        bucketKey,
        name: cleanFileName(input.name),
        mime: input.mime,
        bytes: input.bytes,
      },
    });
    const uploadUrl = await this.storage.presignPut(bucketKey, input.mime, input.bytes, UPLOAD_LINK_SECONDS);
    return {
      fileId: id,
      uploadUrl,
      method: "PUT",
      headers: { "content-type": input.mime },
      expiresAt: new Date(Date.now() + UPLOAD_LINK_SECONDS * 1000).toISOString(),
    };
  }

  /** Verifies the uploaded object; a bad one is deleted with its record. Only the uploader may complete. */
  async complete(actor: AuthUser, id: string): Promise<FileInfo> {
    const row = await this.loadOwn(actor, id);
    if (row.uploadedAt) return toInfo(row);

    const size = await this.storage.size(row.bucketKey);
    if (size === null) throw new ApiHttpException(409, "FILE_NOT_UPLOADED");
    if (size !== row.bytes) {
      await this.discard(row);
      throw new ApiHttpException(400, "FILE_SIZE_MISMATCH");
    }
    const head = await this.storage.readHead(row.bucketKey, 16);
    if (!matchesSignature(row.mime as FileMime, head)) {
      await this.discard(row);
      throw new ApiHttpException(400, "FILE_TYPE_MISMATCH");
    }
    const done = await this.prisma.db.file.update({ where: { id }, data: { uploadedAt: new Date() } });
    return toInfo(done);
  }

  async info(actor: AuthUser, id: string): Promise<FileInfo> {
    return toInfo(await this.loadReadable(actor, id));
  }

  /** A short-lived download link (for <img> tags, which can't send the login token). */
  async url(actor: AuthUser, id: string): Promise<FileUrl> {
    const row = await this.loadReadable(actor, id);
    if (!row.uploadedAt) throw new ApiHttpException(409, "FILE_NOT_UPLOADED");
    return {
      url: await this.storage.presignGet(row.bucketKey, row.name, DOWNLOAD_LINK_SECONDS),
      expiresAt: new Date(Date.now() + DOWNLOAD_LINK_SECONDS * 1000).toISOString(),
    };
  }

  /** Files are readable by signed-in users of the same institute; other institutes get 404. */
  private async loadReadable(actor: AuthUser, id: string): Promise<FileRow> {
    const row = await this.prisma.db.file.findFirst({ where: { id, instituteId: actor.instituteId } });
    if (!row) throw new ApiHttpException(404, "NOT_FOUND");
    return row;
  }

  private async loadOwn(actor: AuthUser, id: string): Promise<FileRow> {
    const row = await this.loadReadable(actor, id);
    if (row.uploadedById !== actor.userId) throw new ApiHttpException(404, "NOT_FOUND");
    return row;
  }

  private async discard(row: FileRow): Promise<void> {
    await this.storage.delete(row.bucketKey).catch(() => undefined);
    await this.prisma.db.file.delete({ where: { id: row.id } });
  }
}
