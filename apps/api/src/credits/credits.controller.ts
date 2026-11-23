import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  AI_JOB_TYPES,
  CreditGrantSchema,
  CreditPriceUpdateSchema,
  PageQuerySchema,
  type AiJobType,
  type CreditBalance,
  type CreditGrant,
  type CreditPriceUpdate,
  type PageQuery,
} from "@edusuite/shared";
import { ZodBody } from "../common/zodBody";
import { ApiHttpException } from "../common/errors";
import { AnySignedIn, CurrentUser, RequirePermission, type AuthUser } from "../auth/authUser";
import { CreditsService } from "./credits.service";

const uuid = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** An institute's own credits: everyone sees the balance; admins see the history (DN-053). */
@Controller("credits")
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get()
  @AnySignedIn()
  balance(@CurrentUser() actor: AuthUser): Promise<CreditBalance> {
    return this.credits.balanceFor(actor);
  }

  @Get("ledger")
  @RequirePermission("audit.view")
  ledger(@CurrentUser() actor: AuthUser, @Query(new ZodBody(PageQuerySchema)) query: PageQuery) {
    return this.credits.ledger(actor.instituteId, query.cursor, query.limit);
  }
}

/** The EduSuite operator's credit console (DN-053). */
@Controller("platform")
@RequirePermission("platform.credits")
export class PlatformController {
  constructor(private readonly credits: CreditsService) {}

  @Get("institutes")
  institutes() {
    return this.credits.listInstitutes();
  }

  @Get("institutes/:id/credits")
  async ledger(@Param("id", uuid) id: string, @Query(new ZodBody(PageQuerySchema)) query: PageQuery) {
    await this.credits.assertTenantInstitute(id);
    return this.credits.ledger(id, query.cursor, query.limit);
  }

  @Post("institutes/:id/credits")
  @HttpCode(201)
  grant(
    @CurrentUser() actor: AuthUser,
    @Param("id", uuid) id: string,
    @Body(new ZodBody(CreditGrantSchema)) body: CreditGrant,
    @Req() req: FastifyRequest,
  ) {
    return this.credits.grant(actor, id, body, { ip: req.ip });
  }

  @Get("credit-prices")
  prices() {
    return this.credits.prices();
  }

  @Put("credit-prices/:jobType")
  setPrice(
    @CurrentUser() actor: AuthUser,
    @Param("jobType") jobType: string,
    @Body(new ZodBody(CreditPriceUpdateSchema)) body: CreditPriceUpdate,
    @Req() req: FastifyRequest,
  ) {
    if (!(AI_JOB_TYPES as string[]).includes(jobType)) throw new ApiHttpException(404, "NOT_FOUND");
    return this.credits.setPrice(actor, jobType as AiJobType, body, { ip: req.ip });
  }
}
