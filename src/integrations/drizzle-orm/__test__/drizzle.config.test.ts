import { afterEach, describe, expect, it, vi } from "vite-plus/test"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("Drizzle migration configuration", () => {
  it("uses explicitly supplied Cloudflare management credentials for D1 migrations", async () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "fixture-account")
    vi.stubEnv("CLOUDFLARE_DATABASE_ID", "fixture-database")
    vi.stubEnv("CLOUDFLARE_ACCESS_TOKEN", "fixture-token")
    const { default: config } = await import("~/src/integrations/drizzle-orm/drizzle.config")

    expect(config).toMatchObject({
      dbCredentials: { accountId: "fixture-account", databaseId: "fixture-database", token: "fixture-token" },
      dialect: "sqlite",
      driver: "d1-http",
      migrations: { prefix: "timestamp", schema: "public", table: "__drizzle_migrations__" },
      out: "./src/integrations/drizzle-orm/migrations",
      schema: "./src/integrations/drizzle-orm/drizzle.schemas.ts",
      strict: true,
    })
  })

  it("can load the schema configuration when management credentials are absent", async () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", undefined)
    vi.stubEnv("CLOUDFLARE_DATABASE_ID", undefined)
    vi.stubEnv("CLOUDFLARE_ACCESS_TOKEN", undefined)
    const { default: config } = await import("~/src/integrations/drizzle-orm/drizzle.config")

    expect(config).toHaveProperty("dbCredentials", { accountId: "", databaseId: "", token: "" })
  })
})
