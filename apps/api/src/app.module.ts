import { type DynamicModule, Module, type Provider, type Type } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ENV, type Env } from "./config/env";
import { HealthController } from "./health/health.controller";
import { ReadinessService } from "./health/readiness.service";
import { PrismaService } from "./prisma/prisma.service";
import { AuditService } from "./audit/audit.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { AuthGuard, LOGIN_RATE_LIMITED, PermissionGuard } from "./auth/guards";
import { UsersController } from "./users/users.controller";
import { UsersService } from "./users/users.service";
import { InstitutesController } from "./institutes/institutes.controller";
import { InstitutesService } from "./institutes/institutes.service";
import { DocumentsController } from "./documents/documents.controller";
import { DocumentsService } from "./documents/documents.service";
import { FilesController } from "./files/files.controller";
import { FilesService } from "./files/files.service";
import { S3Storage, STORAGE } from "./files/storage";

const MINUTE_MS = 60_000;

@Module({})
export class AppModule {
  /**
   * `extraControllers` lets tests mount probe routes and `overrides` swap a
   * provider (e.g. in-memory storage); production passes neither.
   */
  static forRoot(env: Env, extraControllers: Type[] = [], overrides: Provider[] = []): DynamicModule {
    const reflector = new Reflector();
    return {
      module: AppModule,
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            // Plan §09: login and refresh are limited per IP. Other routes are not limited here.
            {
              name: "login",
              ttl: MINUTE_MS,
              limit: env.LOGIN_RATE_LIMIT,
              skipIf: (ctx) => !reflector.get<boolean>(LOGIN_RATE_LIMITED, ctx.getHandler()),
            },
          ],
        }),
      ],
      controllers: [
        HealthController,
        AuthController,
        UsersController,
        InstitutesController,
        DocumentsController,
        FilesController,
        ...extraControllers,
      ],
      providers: [
        { provide: ENV, useValue: env },
        PrismaService,
        AuditService,
        ReadinessService,
        AuthService,
        UsersService,
        InstitutesService,
        DocumentsService,
        FilesService,
        // Replaceable by `overrides` (Nest keeps the first provider for a token, so drop the default).
        ...(overrides.some((p) => typeof p === "object" && "provide" in p && p.provide === STORAGE)
          ? []
          : [{ provide: STORAGE, useClass: S3Storage }]),
        // Order matters: rate limit, then who is calling, then what they may do.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
        ...overrides,
      ],
    };
  }
}
