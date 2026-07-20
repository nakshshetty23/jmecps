// Prisma 7 config file. Connection URLs and the seed command live here,
// not in schema.prisma or package.json's "prisma" key (both deprecated
// in Prisma 7 — see the session report for details).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The Prisma CLI (migrate, introspect) needs a direct, non-pooled
    // connection: Supabase's PgBouncer transaction-mode pooler doesn't
    // support the Schema Engine's session-level operations. Prisma Client
    // at runtime uses the pooled DATABASE_URL instead (see prisma/seed.ts
    // and the future src/lib/prisma.ts client singleton).
    url: env("DIRECT_URL"),
  },
});
