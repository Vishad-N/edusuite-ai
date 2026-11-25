import { z } from "zod";

/** Institute branding shown on printouts, receipts and the header (plan §06 `branding` JSONB). */
export const BrandingSchema = z.object({
  tagline: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(100).optional(),
  /** The institute's own logo, an uploaded PNG/JPEG/WebP of this institute (DN-071). Omit to remove it. */
  logoFileId: z.uuid().optional(),
});
export type Branding = z.infer<typeof BrandingSchema>;

/** Logos are embedded in every PPTX, motion file and printout, so keep them small (DN-071). */
export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;

export const InstituteSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  branding: BrandingSchema,
  aiMonthlyTokenQuota: z.number().int(),
});
export type Institute = z.infer<typeof InstituteSchema>;

/** Code and AI quota are not editable from the app. */
export const InstituteUpdateSchema = z
  .object({ name: z.string().trim().min(1).max(160), branding: BrandingSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "nothing to update" });
export type InstituteUpdate = z.infer<typeof InstituteUpdateSchema>;

/** Branch code appears in receipt numbers (DN-013), e.g. "BKN". */
export const BranchCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,8}$/, { message: "2-8 letters or digits" });

export const BranchSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  city: z.string().nullable(),
});
export type Branch = z.infer<typeof BranchSchema>;

export const BranchCreateSchema = z.object({
  code: BranchCodeSchema,
  name: z.string().trim().min(1).max(160),
  city: z.string().trim().max(100).optional(),
});
export type BranchCreate = z.infer<typeof BranchCreateSchema>;

/** The code can't change once receipts may carry it. */
export const BranchUpdateSchema = z
  .object({ name: z.string().trim().min(1).max(160), city: z.string().trim().max(100).nullable() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "nothing to update" });
export type BranchUpdate = z.infer<typeof BranchUpdateSchema>;
