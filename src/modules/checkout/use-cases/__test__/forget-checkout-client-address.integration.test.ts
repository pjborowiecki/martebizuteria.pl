import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { forgetCheckoutClientAddress } from "~/src/modules/checkout/use-cases/forget-checkout-client-address.server"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const readCheckouts = () =>
  z
    .array(z.object({ client_address: z.string().nullable(), email: z.string(), id: z.string() }))
    .parse(sqlite.prepare("select id, email, client_address from checkout order by id").all())

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into checkout (id, email, status, client_address) values
      ('unopened', 'ada@marte.test', 'pending', '203.0.113.7'),
      ('other', 'ben@marte.test', 'pending', '203.0.113.7');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("forgetCheckoutClientAddress on the migrated schema", () => {
  it("clears the visitor's address of that checkout only and keeps its other details", async () => {
    await forgetCheckoutClientAddress("unopened")

    expect(readCheckouts()).toStrictEqual([
      { client_address: "203.0.113.7", email: "ben@marte.test", id: "other" },
      { client_address: null, email: "ada@marte.test", id: "unopened" },
    ])
  })
})
