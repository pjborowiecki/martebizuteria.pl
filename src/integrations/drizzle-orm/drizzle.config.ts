import { defineConfig } from "drizzle-kit"

const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"]
const databaseId = process.env["CLOUDFLARE_DATABASE_ID"]
const token = process.env["CLOUDFLARE_ACCESS_TOKEN"]

export default defineConfig({
  ...(accountId === undefined || databaseId === undefined || token === undefined
    ? {}
    : { dbCredentials: { accountId, databaseId, token } }),
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
