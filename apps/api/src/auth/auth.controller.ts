import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  ChangePasswordSchema,
  SwitchBranchRequestSchema,
  type ChangePassword,
  type SwitchBranchRequest,
  LoginRequestSchema,
  LogoutRequestSchema,
  RefreshRequestSchema,
  type LoginRequest,
  type LoginResponse,
  type LogoutRequest,
  type RefreshRequest,
  type SessionUser,
  type TokenPair,
} from "@edusuite/shared";
import { ZodBody } from "../common/zodBody";
import { AnySignedIn, CurrentUser, Public, type AuthUser } from "./authUser";
import { AuthService } from "./auth.service";
import { LoginRateLimited } from "./guards";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("auth/login")
  @Public()
  @LoginRateLimited()
  @HttpCode(200)
  login(@Body(new ZodBody(LoginRequestSchema)) body: LoginRequest, @Req() req: FastifyRequest): Promise<LoginResponse> {
    return this.auth.login(body, { ip: req.ip });
  }

  @Post("auth/refresh")
  @Public()
  @LoginRateLimited()
  @HttpCode(200)
  refresh(@Body(new ZodBody(RefreshRequestSchema)) body: RefreshRequest, @Req() req: FastifyRequest): Promise<TokenPair> {
    return this.auth.refresh(body, { ip: req.ip });
  }

  @Post("auth/logout")
  @Public()
  @HttpCode(204)
  async logout(@Body(new ZodBody(LogoutRequestSchema)) body: LogoutRequest, @Req() req: FastifyRequest): Promise<void> {
    await this.auth.logout(body.refreshToken, { ip: req.ip });
  }

  @Post("auth/switch-branch")
  @AnySignedIn()
  @HttpCode(200)
  switchBranch(
    @CurrentUser() user: AuthUser,
    @Body(new ZodBody(SwitchBranchRequestSchema)) body: SwitchBranchRequest,
    @Req() req: FastifyRequest,
  ): Promise<LoginResponse> {
    return this.auth.switchBranch(user, body.branchId, { ip: req.ip });
  }

  /** Rate-limited like login, so a session left open can't be used to guess the password. */
  @Post("me/password")
  @AnySignedIn()
  @LoginRateLimited()
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodBody(ChangePasswordSchema)) body: ChangePassword,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.auth.changePassword(user, body, { ip: req.ip });
  }

  @Get("me")
  @AnySignedIn()
  me(@CurrentUser() user: AuthUser): Promise<SessionUser> {
    return this.auth.me(user);
  }
}
