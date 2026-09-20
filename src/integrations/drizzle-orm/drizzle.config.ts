import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dbCredentials: {
    accountId: process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
    databaseId: process.env["CLOUDFLARE_DATABASE_ID"] ?? "",
    token: process.env["CLOUDFLARE_ACCESS_TOKEN"] ?? "",
  },
  dialect: "sqlite",
  driver: "d1-http",
  migrations: {
    prefix: "timestamp",
    schema: "public",
    table: "__drizzle_migrations__",
  },
  out: "./src/integrations/drizzle-orm/migrations",
  schema: "./src/integrations/drizzle-orm/drizzle.schemas.ts",
  strict: true,
  verbose: true,
})
