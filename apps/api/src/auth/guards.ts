import { type CanActivate, type ExecutionContext, Inject, Injectable, Logger, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { can, type Permission } from "@edusuite/shared";
import { ENV, type Env } from "../config/env";
import { ApiHttpException } from "../common/errors";
import { ANY_SIGNED_IN, IS_PUBLIC, REQUIRED_PERMISSION } from "./authUser";
import { verifyAccessToken } from "./crypto";

/** Marks the routes the "login" rate limit applies to (see app.module.ts). */
export const LOGIN_RATE_LIMITED = "edusuite:loginRateLimited";
export const LoginRateLimited = () => SetMetadata(LOGIN_RATE_LIMITED, true);
export const AI_RATE_LIMITED = "edusuite:aiRateLimited";
/** Limits how many AI jobs one session starts per minute (DN-065). */
export const AiRateLimited = () => SetMetadata(AI_RATE_LIMITED, true);

/** Verifies the Bearer access token on every route not marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || !this.env.JWT_SECRET) throw new ApiHttpException(401, "UNAUTHORIZED");

    const user = await verifyAccessToken(token, this.env.JWT_SECRET);
    if (!user) throw new ApiHttpException(401, "UNAUTHORIZED");
    req.authUser = user;
    return true;
  }
}

/**
 * Checks the role against packages/shared/permissions.ts. Deny by default:
 * a route must say @Public(), @AnySignedIn() or @RequirePermission(...),
 * so a forgotten decorator can never leave a route open.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger("PermissionGuard");

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const user = context.switchToHttp().getRequest<FastifyRequest>().authUser;
    if (!user) throw new ApiHttpException(401, "UNAUTHORIZED");

    const permission = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRED_PERMISSION, targets);
    if (permission) {
      if (can(user.role, permission)) return true;
      throw new ApiHttpException(403, "FORBIDDEN");
    }
    if (this.reflector.getAllAndOverride<boolean>(ANY_SIGNED_IN, targets)) return true;

    this.logger.error(`route ${context.getClass().name}.${context.getHandler().name} has no permission decorator`);
    throw new ApiHttpException(403, "FORBIDDEN");
  }
}
