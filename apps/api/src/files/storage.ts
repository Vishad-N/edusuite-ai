import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV, type Env } from "../config/env";
import { ApiHttpException } from "../common/errors";

/** What the files module needs from object storage; tests provide an in-memory fake. */
export interface Storage {
  readonly configured: boolean;
  presignPut(key: string, mime: string, bytes: number, expiresInSec: number): Promise<string>;
  presignGet(key: string, downloadName: string, expiresInSec: number): Promise<string>;
  /** Size of a stored object, or null if it isn't there. */
  size(key: string): Promise<number | null>;
  /** The first `n` bytes, to check the file signature. */
  readHead(key: string, n: number): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

export const STORAGE = Symbol("STORAGE");

/**
 * Garage (or any S3-compatible store) through the AWS SDK v3 (DN-039).
 * Two clients: one for the API's own calls on the private Docker network,
 * one that signs links for the address the desktop app can reach.
 */
@Injectable()
export class S3Storage implements Storage, OnModuleInit {
  private readonly logger = new Logger("S3Storage");
  private readonly internal?: S3Client;
  private readonly signer?: S3Client;
  private readonly bucket: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.bucket = env.S3_BUCKET ?? "";
    if (!this.configured) return;
    const credentials = { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! };
    const common = {
      region: env.S3_REGION,
      credentials,
      forcePathStyle: true,
      // The SDK's default adds a CRC32 of the (empty) body to presigned PUT links,
      // which makes every real upload fail with InvalidDigest. Only add checksums when required.
      requestChecksumCalculation: "WHEN_REQUIRED" as const,
      responseChecksumValidation: "WHEN_REQUIRED" as const,
    };
    this.internal = new S3Client({ ...common, endpoint: env.S3_ENDPOINT! });
    this.signer = new S3Client({ ...common, endpoint: env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT! });
  }

  get configured(): boolean {
    const e = this.env;
    return Boolean(e.S3_ENDPOINT && e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY);
  }

  /**
   * Lets the desktop app (file://, "Origin: null") and allowed dev origins PUT and
   * GET through presigned links. Best effort: a failure is logged, not fatal.
   */
  async onModuleInit(): Promise<void> {
    if (!this.internal || this.env.NODE_ENV === "test") return;
    try {
      await this.internal.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            // One rule per origin: Garage echoes a rule's whole origin list, and browsers
            // accept only a single origin in Access-Control-Allow-Origin.
            CORSRules: this.env.CORS_ORIGINS.map((origin) => ({
              AllowedOrigins: [origin],
              AllowedMethods: ["GET", "PUT", "HEAD"],
              AllowedHeaders: ["content-type", "content-length"],
              MaxAgeSeconds: 600,
            })),
          },
        }),
      );
    } catch (err) {
      this.logger.warn(`could not set bucket CORS (${err instanceof Error ? err.name : "unknown"}); uploads from the app may fail`);
    }
  }

  private client(which: "internal" | "signer"): S3Client {
    const c = which === "internal" ? this.internal : this.signer;
    if (!c) throw new ApiHttpException(503, "SERVICE_UNAVAILABLE");
    return c;
  }

  presignPut(key: string, mime: string, bytes: number, expiresInSec: number): Promise<string> {
    // Content type and length are part of the signature, so the upload must match them.
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mime, ContentLength: bytes });
    return getSignedUrl(this.client("signer"), cmd, {
      expiresIn: expiresInSec,
      signableHeaders: new Set(["content-type", "content-length"]),
    });
  }

  presignGet(key: string, downloadName: string, expiresInSec: number): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    });
    return getSignedUrl(this.client("signer"), cmd, { expiresIn: expiresInSec });
  }

  async size(key: string): Promise<number | null> {
    try {
      const head = await this.client("internal").send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return head.ContentLength ?? null;
    } catch (err) {
      if (err instanceof Error && (err.name === "NotFound" || err.name === "NoSuchKey")) return null;
      throw err;
    }
  }

  async readHead(key: string, n: number): Promise<Uint8Array> {
    const res = await this.client("internal").send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${n - 1}` }),
    );
    return res.Body ? res.Body.transformToByteArray() : new Uint8Array();
  }

  async delete(key: string): Promise<void> {
    await this.client("internal").send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
