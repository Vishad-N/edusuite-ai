import { scopeFor, type Permission } from "@edusuite/shared";
import { ApiHttpException } from "../common/errors";
import type { AuthUser } from "./authUser";

/**
 * Institute scoping (AGENT_README §7): never trust an instituteId or branchId
 * from the client. Every query filters by the caller's own institute, and by
 * branch when the role's grant is branch-scoped.
 */
export function scopeWhere(user: AuthUser, permission: Permission): { instituteId: string; branchId?: string } {
  const scope = scopeFor(user.role, permission);
  if (!scope) throw new ApiHttpException(403, "FORBIDDEN");
  // The operator's platform scope never scopes institute data (DN-053).
  if (scope === "platform") throw new ApiHttpException(403, "FORBIDDEN");
  return scope === "institute"
    ? { instituteId: user.instituteId }
    : { instituteId: user.instituteId, branchId: user.branchId };
}

/**
 * For a record loaded by id: answers 404, not 403, when it belongs to another
 * institute, so callers can't learn which ids exist elsewhere.
 */
export function assertSameInstitute(user: AuthUser, record: { instituteId: string } | null | undefined): void {
  if (!record || record.instituteId !== user.instituteId) throw new ApiHttpException(404, "NOT_FOUND");
}
