import { z } from "zod";
import { ALL_ROLES, ROLES, type Role } from "./permissions.ts";
import { PageQuerySchema } from "./pagination.ts";

/** Minimum password length for staff accounts. */
export const MIN_PASSWORD_LENGTH = 8;

const PasswordSchema = z.string().min(MIN_PASSWORD_LENGTH).max(200);

/** Trims and lowercases before checking the format (zod checks z.email() before transforms). */
const EmailSchema = z.string().trim().toLowerCase().max(200).pipe(z.email());

/** Indian mobile number in any common format; stored as +91 and the last 10 digits. */
export const PhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((digits) => digits.length >= 10 && digits.length <= 12, { message: "10-digit mobile number" })
  .transform((digits) => `+91${digits.slice(-10)}`);

export const EmployeeCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{1,29}$/, { message: "letters, digits and dashes" });

export const USER_STATUSES = ["active", "blocked"] as const;

export const UserSchema = z.object({
  id: z.uuid(),
  employeeCode: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  displayName: z.string(),
  fullName: z.string(),
  role: z.enum(ALL_ROLES),
  status: z.enum(USER_STATUSES),
  /** Home branch. */
  branchId: z.uuid(),
  /** Other branches the user may pick at login (DN-015). */
  extraBranchIds: z.array(z.uuid()),
  /** Set while the account is locked after wrong passwords. */
  lockedUntil: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const UserListQuerySchema = PageQuerySchema.extend({
  /** Matches name, email or employee code. */
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});
export type UserListQuery = z.infer<typeof UserListQuerySchema>;

export const UserCreateSchema = z.object({
  employeeCode: EmployeeCodeSchema,
  email: EmailSchema,
  phone: PhoneSchema.optional(),
  displayName: z.string().trim().min(1).max(80),
  fullName: z.string().trim().min(1).max(160),
  role: z.enum(ROLES),
  branchId: z.uuid(),
  extraBranchIds: z.array(z.uuid()).max(20).default([]),
  /** Set by the admin and stored only as an argon2id hash. */
  password: PasswordSchema,
});
export type UserCreate = z.input<typeof UserCreateSchema>;

/** Employee code can't change after creation; passwords change only through reset. */
export const UserUpdateSchema = z
  .object({
    email: EmailSchema,
    phone: PhoneSchema.nullable(),
    displayName: z.string().trim().min(1).max(80),
    fullName: z.string().trim().min(1).max(160),
    role: z.enum(ROLES),
    branchId: z.uuid(),
    extraBranchIds: z.array(z.uuid()).max(20),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "nothing to update" });
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const ResetPasswordSchema = z.object({ password: PasswordSchema });
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;

/**
 * Which roles a manager may give or manage (DN-034): a branch admin manages
 * only teachers, typists and counselors; a super admin manages everyone.
 */
export function assignableRoles(managerRole: Role): Role[] {
  if (managerRole === "superadmin") return [...ROLES];
  if (managerRole === "branch_admin") return ["teacher", "typist", "counselor"];
  return [];
}
