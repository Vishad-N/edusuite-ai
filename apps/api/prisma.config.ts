import { defineConfig } from "prisma/config";

// DATABASE_URL comes from .env.local (local) or the server environment (production).
// It may be unset for commands that don't touch a database, such as `prisma generate`.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
