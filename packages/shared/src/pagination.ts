import { z } from "zod";

/**
 * Cursor pagination (plan §07): lists are ordered by (updated_at, id), newest
 * first, which stays stable while staff add records. The cursor is opaque to
 * clients: base64url of "<ISO updatedAt>|<id>".
 */
export const PageQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;

export type Page<T> = { items: T[]; nextCursor: string | null };

export function encodeCursor(row: { updatedAt: Date; id: string }): string {
  return Buffer.from(`${row.updatedAt.toISOString()}|${row.id}`, "utf8").toString("base64url");
}

/** Returns null for a malformed cursor, so callers can answer 400 instead of crashing. */
export function decodeCursor(cursor: string): { updatedAt: Date; id: string } | null {
  try {
    const [iso, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    const updatedAt = new Date(iso ?? "");
    if (!id || Number.isNaN(updatedAt.getTime())) return null;
    return { updatedAt, id };
  } catch {
    return null;
  }
}
