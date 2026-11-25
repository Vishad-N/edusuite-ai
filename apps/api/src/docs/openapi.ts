import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ModulesContainer } from "@nestjs/core";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { z, type ZodType } from "zod";
import { ZodBody } from "../common/zodBody";
import { ANY_SIGNED_IN, IS_PUBLIC, REQUIRED_PERMISSION } from "../auth/authUser";
import type { Env } from "../config/env";

type Operation = {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Array<Record<string, unknown>>;
  requestBody?: unknown;
  security?: Array<Record<string, string[]>>;
  tags?: string[];
};

/** JSON Schema of what the route accepts (input side, so defaults are optional). */
const jsonSchema = (schema: ZodType) => z.toJSONSchema(schema, { io: "input", unrepresentable: "any", target: "openapi-3.0" }) as Record<string, unknown>;

/**
 * The OpenAPI document (plan §07, "an OpenAPI spec generated from the zod schemas"; DN-067).
 * Routes come from the controllers; every body, query and header a route validates with
 * `ZodBody` is read from Nest's route metadata, so the docs can't drift from validation.
 */
export function buildOpenApi(app: NestFastifyApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("EduSuite API")
    .setDescription(
      "REST under /api/v1. Errors are always { code, message, details } in Hindi or English (Accept-Language). " +
        "Sign in with POST /api/v1/auth/login and send the access token as a Bearer token. " +
        "POST /ai/jobs and POST /fee-receipts need an Idempotency-Key header.",
    )
    .setVersion("1")
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);

  const ops = new Map<string, Operation>();
  for (const item of Object.values(doc.paths)) {
    for (const op of Object.values(item as Record<string, Operation>)) if (op?.operationId) ops.set(op.operationId, op);
  }

  for (const module of app.get(ModulesContainer).values()) {
    for (const wrapper of module.controllers.values()) {
      const ctrl = wrapper.metatype as (new (...a: never[]) => object) | null;
      if (!ctrl?.prototype) continue;
      const classPublic = Reflect.getMetadata(IS_PUBLIC, ctrl) === true;
      for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
        const op = ops.get(`${ctrl.name}_${name}`);
        if (!op) continue;
        const handler = (ctrl.prototype as Record<string, unknown>)[name] as object;
        op.tags = [ctrl.name.replace(/Controller$/, "")];

        // Who may call it.
        const isPublic = classPublic || Reflect.getMetadata(IS_PUBLIC, handler) === true;
        const permission = Reflect.getMetadata(REQUIRED_PERMISSION, handler) ?? Reflect.getMetadata(REQUIRED_PERMISSION, ctrl);
        const anySignedIn = Reflect.getMetadata(ANY_SIGNED_IN, handler) ?? Reflect.getMetadata(ANY_SIGNED_IN, ctrl);
        if (!isPublic) op.security = [{ bearer: [] }];
        op.description = isPublic
          ? "Public."
          : permission
            ? `Needs the \`${String(permission)}\` permission (packages/shared/src/permissions.ts).`
            : anySignedIn
              ? "Any signed-in user; the service checks the permission for the specific type."
              : "Signed in.";

        // What it validates.
        const args = (Reflect.getMetadata(ROUTE_ARGS_METADATA, ctrl, name) ?? {}) as Record<string, { data?: string; pipes?: unknown[] }>;
        for (const [key, arg] of Object.entries(args)) {
          const type = Number(key.split(":")[0]);
          const zod = (arg.pipes ?? []).find((p): p is ZodBody<unknown> => p instanceof ZodBody)?.schema;
          if (type === RouteParamtypes.BODY && zod) {
            op.requestBody = { required: true, content: { "application/json": { schema: jsonSchema(zod) } } };
          } else if (type === RouteParamtypes.QUERY && zod) {
            const s = jsonSchema(zod) as { properties?: Record<string, object>; required?: string[] };
            op.parameters = [
              ...(op.parameters ?? []).filter((p) => p.in !== "query"),
              ...Object.entries(s.properties ?? {}).map(([pname, schema]) => ({ name: pname, in: "query", required: (s.required ?? []).includes(pname), schema })),
            ];
          } else if (type === RouteParamtypes.HEADERS && arg.data) {
            op.parameters = [
              ...(op.parameters ?? []).filter((p) => !(p.in === "header" && p.name === arg.data)),
              { name: arg.data, in: "header", required: true, schema: { type: "string", minLength: 8, maxLength: 100 } },
            ];
          }
        }
      }
    }
  }
  return doc;
}

const UI_FILES: Record<string, string> = {
  "swagger-ui.css": "text/css; charset=utf-8",
  "swagger-ui-bundle.js": "application/javascript; charset=utf-8",
  "swagger-ui-standalone-preset.js": "application/javascript; charset=utf-8",
};

/** swagger-ui-dist comes with @nestjs/swagger; resolve it from there. */
function swaggerUiDir(): string {
  const swagger = require.resolve("@nestjs/swagger");
  return dirname(require.resolve("swagger-ui-dist/package.json", { paths: [swagger] }));
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EduSuite API</title>
<link rel="stylesheet" href="/docs/assets/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="/docs/assets/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: "/docs/openapi.json", dom_id: "#swagger-ui", docExpansion: "none", persistAuthorization: false });</script>
</body>
</html>`;

/**
 * Serves the docs at /docs (page), /docs/openapi.json and /docs/openapi.yaml unless switched
 * off (DN-067). The page's three files are read from swagger-ui-dist directly, so no static
 * file plugin is needed and the page works offline.
 */
export function setupApiDocs(app: NestFastifyApplication, env: Env): void {
  if (!env.API_DOCS) return;
  SwaggerModule.setup("docs", app, buildOpenApi(app), {
    swaggerUiEnabled: false,
    jsonDocumentUrl: "docs/openapi.json",
    yamlDocumentUrl: "docs/openapi.yaml",
  });
  const dir = swaggerUiDir();
  const fastify = app.getHttpAdapter().getInstance();
  fastify.get("/docs", (_req, reply) => {
    void reply.type("text/html; charset=utf-8").send(PAGE);
  });
  fastify.get<{ Params: { file: string } }>("/docs/assets/:file", (req, reply) => {
    const type = UI_FILES[req.params.file];
    if (!type) return void reply.code(404).send();
    void reply.type(type).header("cache-control", "public, max-age=86400").send(createReadStream(join(dir, req.params.file)));
  });
}