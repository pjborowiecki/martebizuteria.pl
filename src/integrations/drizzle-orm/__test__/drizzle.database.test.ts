import { sql } from "drizzle-orm"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestD1Database } from "~/src/platform/testing/mocks/d1"

const binding = vi.hoisted((): { env: { DB?: D1Database } } => ({ env: {} }))

vi.mock("cloudflare:workers", () => ({ env: binding.env }))

afterEach(() => {
  delete binding.env.DB
  vi.resetModules()
})

describe("the shared database client", () => {
  it("loads while the Worker has no database binding, as when Cloudflare validates an upload", async () => {
    await expect(import("~/src/integrations/drizzle-orm/drizzle.database")).resolves.toHaveProperty("db")
  })

  it("reads the binding when a query runs, not when the module loads", async () => {
    const { db } = await import("~/src/integrations/drizzle-orm/drizzle.database")
    const queries: string[] = []
    binding.env.DB = createTestD1Database(new DatabaseSync(":memory:"), (query) => {
      queries.push(query.sql)
    })

    await db.run(sql`select 1 as answer`)

    expect(queries).toStrictEqual(["select 1 as answer"])
  })
})
