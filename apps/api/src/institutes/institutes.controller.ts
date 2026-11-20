import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  BranchCreateSchema,
  BranchUpdateSchema,
  InstituteUpdateSchema,
  type Branch,
  type BranchCreate,
  type BranchUpdate,
  type Institute,
  type InstituteUpdate,
} from "@edusuite/shared";
import { ZodBody } from "../common/zodBody";
import { AnySignedIn, CurrentUser, RequirePermission, type AuthUser } from "../auth/authUser";
import { InstitutesService } from "./institutes.service";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** Plan §07 INSTITUTES (plus PATCH for one branch, so a branch admin can edit their own). */
@Controller("institutes")
export class InstitutesController {
  constructor(private readonly institutes: InstitutesService) {}

  @Get()
  @AnySignedIn()
  list(@CurrentUser() actor: AuthUser): Promise<Institute[]> {
    return this.institutes.list(actor);
  }

  @Get(":id")
  @AnySignedIn()
  get(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string): Promise<Institute> {
    return this.institutes.get(actor, id);
  }

  @Patch(":id")
  @RequirePermission("institute.settings")
  update(
    @CurrentUser() actor: AuthUser,
    @Param("id", uuid) id: string,
    @Body(new ZodBody(InstituteUpdateSchema)) body: InstituteUpdate,
    @Req() req: FastifyRequest,
  ): Promise<Institute> {
    return this.institutes.update(actor, id, body, { ip: req.ip });
  }

  @Get(":id/branches")
  @AnySignedIn()
  branches(@CurrentUser() actor: AuthUser, @Param("id", uuid) id: string): Promise<Branch[]> {
    return this.institutes.listBranches(actor, id);
  }

  @Post(":id/branches")
  @RequirePermission("institute.settings")
  createBranch(
    @CurrentUser() actor: AuthUser,
    @Param("id", uuid) id: string,
    @Body(new ZodBody(BranchCreateSchema)) body: BranchCreate,
    @Req() req: FastifyRequest,
  ): Promise<Branch> {
    return this.institutes.createBranch(actor, id, body, { ip: req.ip });
  }

  @Patch(":id/branches/:branchId")
  @RequirePermission("institute.settings")
  updateBranch(
    @CurrentUser() actor: AuthUser,
    @Param("id", uuid) id: string,
    @Param("branchId", uuid) branchId: string,
    @Body(new ZodBody(BranchUpdateSchema)) body: BranchUpdate,
    @Req() req: FastifyRequest,
  ): Promise<Branch> {
    return this.institutes.updateBranch(actor, id, branchId, body, { ip: req.ip });
  }
}
