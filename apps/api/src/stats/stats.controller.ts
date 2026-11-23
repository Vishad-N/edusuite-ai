import { Controller, Get } from "@nestjs/common";
import type { DashboardStats } from "@edusuite/shared";
import { AnySignedIn, CurrentUser, type AuthUser } from "../auth/authUser";
import { StatsService } from "./stats.service";

/**
 * Plan §07 `GET /stats/dashboard`. Every role has a dashboard (DN-008), so the route
 * needs any signed-in user; StatsService counts only what the caller may see.
 */
@Controller("stats")
@AnySignedIn()
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() actor: AuthUser): Promise<DashboardStats> {
    return this.stats.dashboard(actor);
  }
}
