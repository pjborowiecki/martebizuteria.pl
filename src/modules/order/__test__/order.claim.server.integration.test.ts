import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { claimGuestOrdersForUser } from "~/src/modules/order/order.claim.server"

const NOW = Date.UTC(2026, 0, 10)

const ownerOf = (orderId: string): string | null =>
  z.object({ user_id: z.string().nullable() }).parse(sqlite.prepare(`select user_id from "order" where id = ?`).get(orderId)).user_id

beforeEach(() => {
  sqlite.exec(`
    drop table if exists "order";
    create table "order" (
      id text primary key, user_id text, email text not null, order_number text not null,
      created_at integer not null, updated_at integer not null
    );
    insert into "order" (id, user_id, email, order_number, created_at, updated_at) values
      ('guest-1', null, 'anna@example.com', 'MRT-2026-00001', ${NOW}, ${NOW}),
      ('guest-2', null, 'ANNA@Example.com', 'MRT-2026-00002', ${NOW}, ${NOW}),
      ('guest-other', null, 'someone@example.com', 'MRT-2026-00003', ${NOW}, ${NOW}),
      ('owned', 'user-existing', 'anna@example.com', 'MRT-2026-00004', ${NOW}, ${NOW});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("claimGuestOrdersForUser", () => {
  it("links every unowned order placed with that address", async () => {
    await expect(claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })).resolves.toBe(2)
    expect(ownerOf("guest-1")).toBe("user-1")
  })

  it("matches the address regardless of how it was typed", async () => {
    await claimGuestOrdersForUser({ email: "  Anna@EXAMPLE.com  ", userId: "user-1" })

    expect(ownerOf("guest-2")).toBe("user-1")
  })

  it("leaves other people's guest orders alone", async () => {
    await claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })

    expect(ownerOf("guest-other")).toBeNull()
  })

  it("never reassigns an order that already has an owner", async () => {
    await claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })

    expect(ownerOf("owned")).toBe("user-existing")
  })

  it("claims nothing for a blank address rather than sweeping up every guest order", async () => {
    await expect(claimGuestOrdersForUser({ email: "   ", userId: "user-1" })).resolves.toBe(0)
    expect(ownerOf("guest-1")).toBeNull()
  })

  it("is safe to run again once the orders are already claimed", async () => {
    await claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })

    await expect(claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })).resolves.toBe(0)
  })
})
