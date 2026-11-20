import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  ResetPasswordSchema,
  UserCreateSchema,
  UserListQuerySchema,
  UserUpdateSchema,
  type Page,
  type ResetPassword,
  type User,
  type UserListQuery,
  type UserUpdate,
} from "@edusuite/shared";
import type { z } from "zod";
import { ZodBody } from "../common/zodBody";
import { CurrentUser, RequirePermission, type AuthUser } from "../auth/authUser";
import { UsersService } from "./users.service";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** Plan §07 USERS. All routes need users.manage; scope and rank rules are in UsersService. */
@Controller("users")
@RequirePermission("users.manage")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser, @Query(new ZodBody(UserListQuerySchema)) query: UserListQuery): Promise<Page<User>> {
    return this.users.list(actor, query);
  }

  @Post()
  create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodBody(UserCreateSchema)) body: z.output<typeof UserCreateSchema>,
    @Req() req: FastifyRequest,
  ): Promise<User> {
    return this.users.create(actor, body, { ip: req.ip });
  }

  @Get(":id")
  get(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string): Promise<User> {
    return this.users.get(actor, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() actor: AuthUser,
    @Param("id", uuid) id: string,
    @Body(new ZodBody(UserUpdateSchema)) body: UserUpdate,
    @Req() req: FastifyRequest,
  ): Promise<User> {
    return this.users.update(actor, id, body, { ip: req.ip });
  }

  @Post(":id/block")
  @HttpCode(200)
  block(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Req() req: FastifyRequest): Promise<User> {
    return this.users.setBlocked(actor, id, true, { ip: req.ip });
  }

  @Post(":id/unblock")
  @HttpCode(200)
  unblock(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string, @Req() req: FastifyRequest): Promise<User> {
    return this.users.setBlocked(actor, id, false, { ip: req.ip });
  }

  @Post(":id/reset-password")
  @HttpCode(204)
  async resetPassword(
    @CurrentUser() actor: AuthUser,
    @Param("id", uuid) id: string,
    @Body(new ZodBody(ResetPasswordSchema)) body: ResetPassword,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.users.resetPassword(actor, id, body, { ip: req.ip });
  }
}
