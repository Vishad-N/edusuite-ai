import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { Provider, Type } from "@nestjs/common";
import type { PrismaClient } from "../../src/generated/prisma/client";
import { createApp } from "../../src/bootstrap";
import { loadEnv } from "../../src/config/env";
import { PASSWORD, createFixtures, type Fixtures } from "./fixtures";
import { prepareTestDatabase, testDatabaseUrl } from "./testDb";

export const DEVICE = "test-device-0001";

export type TestApp = {
  app: NestFastifyApplication;
  db: PrismaClient;
  fx: Fixtures;
  /** Logs in and returns the access token. */
  token: (identifier: string, password?: string) => Promise<string>;
  call: (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    token?: string,
    payload?: object,
  ) => ReturnType<NestFastifyApplication["inject"]>;
  close: () => Promise<void>;
};

/** Fresh database with fixtures, and an app instance wired to it. */
export async function startTestApp(extraControllers: Type[] = [], overrides: Provider[] = []): Promise<TestApp> {
  const db = await prepareTestDatabase(testDatabaseUrl()!);
  const fx = await createFixtures(db);
  const app = await createApp(
    loadEnv({
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      LOGIN_RATE_LIMIT: "1000",
    }),
    extraControllers,
    overrides,
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const call: TestApp["call"] = (method, url, token, payload) =>
    app.inject({
      method,
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      ...(payload !== undefined && { payload }),
    });

  const token = async (identifier: string, password = PASSWORD) => {
    const res = await call("POST", "/api/v1/auth/login", undefined, { identifier, password, deviceId: DEVICE });
    if (res.statusCode !== 200) throw new Error(`login ${identifier} failed: ${res.statusCode} ${res.body}`);
    return res.json().accessToken as string;
  };

  return {
    app,
    db,
    fx,
    token,
    call,
    close: async () => {
      await app.close();
      await db.$disconnect();
    },
  };
}
