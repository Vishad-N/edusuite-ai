import { type DynamicModule, Module } from "@nestjs/common";
import { ENV, type Env } from "./config/env";
import { HealthController } from "./health/health.controller";
import { ReadinessService } from "./health/readiness.service";

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController],
      providers: [{ provide: ENV, useValue: env }, ReadinessService],
    };
  }
}
