import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { Permission, Role } from "@edusuite/shared";

/** Who is calling, taken only from the verified access token, never from the request body. */
export type AuthUser = {
  userId: string;
  sessionId: string;
  instituteId: string;
  branchId: string;
  role: Role;
};

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export const IS_PUBLIC = "edusuite:isPublic";
export const REQUIRED_PERMISSION = "edusuite:permission";
export const ANY_SIGNED_IN = "edusuite:anySignedIn";

/** No sign-in needed (login, refresh, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Signed-in users with this permission only (packages/shared/permissions.ts). */
export const RequirePermission = (permission: Permission) => SetMetadata(REQUIRED_PERMISSION, permission);

/** Any signed-in user, whatever the role (e.g. GET /me). */
export const AnySignedIn = () => SetMetadata(ANY_SIGNED_IN, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<FastifyRequest>().authUser;
  if (!user) throw new Error("CurrentUser used on a route without authentication");
  return user;
});
