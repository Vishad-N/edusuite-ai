import { z } from "zod";

/**
 * Files staff upload (screenshots, logos, ID photos, PDFs): plan §07 FILES,
 * AGENT_README §8 ("check every upload's type and size, store under random keys").
 * The API checks the declared type and size before signing an upload, and the
 * real size and file signature (first bytes) after it.
 */
export const FILE_TYPES = {
  "image/png": { maxBytes: 10 * 1024 * 1024, extension: "png" },
  "image/jpeg": { maxBytes: 10 * 1024 * 1024, extension: "jpg" },
  "image/webp": { maxBytes: 10 * 1024 * 1024, extension: "webp" },
  "application/pdf": { maxBytes: 25 * 1024 * 1024, extension: "pdf" },
} as const;

export type FileMime = keyof typeof FILE_TYPES;
export const FILE_MIMES = Object.keys(FILE_TYPES) as FileMime[];

/** Does the start of the file match the declared type? (PNG, JPEG, WebP, PDF signatures.) */
export function matchesSignature(mime: FileMime, head: Uint8Array): boolean {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (mime) {
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/webp":
      // "RIFF" ???? "WEBP"
      return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46, 0x2d); // "%PDF-"
  }
}

/** Keeps letters (Devanagari included), digits and a few safe marks; never a path. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^\p{L}\p{N}\p{M} ._()-]/gu, "_").replace(/^\.+/, "").slice(0, 120).trim();
  return cleaned || "file";
}

export const FilePresignRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    mime: z.enum(FILE_MIMES as [FileMime, ...FileMime[]]),
    bytes: z.number().int().min(1),
  })
  .superRefine((v, ctx) => {
    if (v.bytes > FILE_TYPES[v.mime].maxBytes) {
      ctx.addIssue({ code: "custom", path: ["bytes"], message: "too large" });
    }
  });
export type FilePresignRequest = z.infer<typeof FilePresignRequestSchema>;

export const FilePresignResponseSchema = z.object({
  fileId: z.uuid(),
  /** PUT the bytes here, with exactly these headers, before `expiresAt`. */
  uploadUrl: z.url(),
  method: z.literal("PUT"),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.iso.datetime(),
});
export type FilePresignResponse = z.infer<typeof FilePresignResponseSchema>;

export const FileInfoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  mime: z.enum(FILE_MIMES as [FileMime, ...FileMime[]]),
  bytes: z.number().int(),
  uploadedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type FileInfo = z.infer<typeof FileInfoSchema>;

export const FileUrlSchema = z.object({ url: z.url(), expiresAt: z.iso.datetime() });
export type FileUrl = z.infer<typeof FileUrlSchema>;
