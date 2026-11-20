import { z } from "zod";
import { PERMISSIONS, ROLES, can, type Permission, type Role } from "./permissions.ts";

/**
 * Auth request and response shapes (plan §05 Daily login, §07 AUTH).
 * The API validates requests with these; the desktop app types its calls with them.
 */

export const LoginRequestSchema = z.object({
  /** Employee code, email or 10-digit mobile number. */
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
  /** Branch picked at login; must be one the user may work at (DN-015). Defaults to the home branch. */
  branchId: z.uuid().optional(),
  /** Stable id of this PC's install, kept by the desktop app. */
  deviceId: z.string().trim().min(8).max(100),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(20).max(200),
  deviceId: z.string().trim().min(8).max(100),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

const BranchRefSchema = z.object({ id: z.uuid(), name: z.string(), code: z.string() });

/** The signed-in user, as returned by POST /auth/login and GET /me. */
export const SessionUserSchema = z.object({
  id: z.uuid(),
  employeeCode: z.string(),
  displayName: z.string(),
  fullName: z.string(),
  role: z.enum(ROLES),
  institute: z.object({ id: z.uuid(), name: z.string(), code: z.string() }),
  /** The branch this session is working at. */
  branch: BranchRefSchema,
  /** All branches the user may pick at login. */
  branches: z.array(BranchRefSchema),
  /** Everything this role may do, from permissions.ts, so the UI can hide what it can't use. */
  permissions: z.array(z.enum(PERMISSIONS)),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.iso.datetime(),
  refreshToken: z.string(),
  /** 23:59 IST on the day of login (plan §05). */
  refreshTokenExpiresAt: z.iso.datetime(),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

export const LoginResponseSchema = TokenPairSchema.extend({ user: SessionUserSchema });
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export function permissionsFor(role: Role): Permission[] {
  return PERMISSIONS.filter((p) => can(role, p));
}

/**
 * End of the current day in India (23:59:59.999 IST) as a UTC Date.
 * IST is UTC+05:30 all year (no daylight saving).
 */
export function endOfIstDay(now: Date = new Date()): Date {
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const endIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 23, 59, 59, 999);
  return new Date(endIst - IST_OFFSET_MS);
}
