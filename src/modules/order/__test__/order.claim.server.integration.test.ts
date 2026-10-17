import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { recordCustomerOrdersClaimedAudit, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    recordCustomerOrdersClaimedAudit: vi.fn<(email: string, options: { metadata: object; resourceId: string }) => void>(),
    sqlite: new DatabaseSync(":memory:"),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordCustomerOrdersClaimedAudit }))
vi.spyOn(console, "info").mockImplementation(() => {})

import { claimGuestOrdersForUser } from "~/src/modules/order/order.claim.server"

const NOW = Date.UTC(2026, 0, 10)

const ownerOf = (orderId: string): string | null =>
  z.object({ user_id: z.string().nullable() }).parse(sqlite.prepare(`select user_id from "order" where id = ?`).get(orderId)).user_id

const redeemerOf = (redemptionId: string) =>
  z
    .object({ updated_at: z.number(), user_id: z.string().nullable() })
    .parse(sqlite.prepare("select user_id, updated_at from discount_redemption where id = ?").get(redemptionId))

beforeEach(() => {
  recordCustomerOrdersClaimedAudit.mockClear()
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists discount_redemption;
    create table discount_redemption (id text primary key, order_id text unique, user_id text, updated_at integer not null);
    create table "order" (
      id text primary key, user_id text, email text not null, order_number text not null,
      created_at integer not null, updated_at integer not null
    );
    insert into "order" (id, user_id, email, order_number, created_at, updated_at) values
      ('guest-1', null, 'anna@example.com', 'MRT-2026-00001', ${NOW}, ${NOW}),
      ('guest-2', null, 'ANNA@Example.com', 'MRT-2026-00002', ${NOW}, ${NOW}),
      ('guest-other', null, 'someone@example.com', 'MRT-2026-00003', ${NOW}, ${NOW}),
      ('owned', 'user-existing', 'anna@example.com', 'MRT-2026-00004', ${NOW}, ${NOW});
    insert into discount_redemption (id, order_id, user_id, updated_at) values
      ('redeemed-as-guest', 'guest-1', null, ${NOW}),
      ('redeemed-by-someone', 'guest-other', null, ${NOW}),
      ('redeemed-by-owner', 'owned', 'user-existing', ${NOW});
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

  it("records which orders it linked to the account in the audit log", async () => {
    await claimGuestOrdersForUser({ email: " Anna@Example.com", userId: "user-1" })

    expect(recordCustomerOrdersClaimedAudit).toHaveBeenCalledExactlyOnceWith("anna@example.com", {
      metadata: { orderCount: 2, orderIds: ["guest-1", "guest-2"] },
      resourceId: "user-1",
    })
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
    expect(recordCustomerOrdersClaimedAudit).toHaveBeenCalledOnce()
  })

  it("files the code a claimed order redeemed under the account too", async () => {
    vi.useFakeTimers({ now: NOW + 1, toFake: ["Date"] })
    await claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })
    vi.useRealTimers()

    expect(redeemerOf("redeemed-as-guest")).toStrictEqual({ updated_at: NOW + 1, user_id: "user-1" })
  })

  it("leaves the codes redeemed on other people's orders alone", async () => {
    await claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })

    expect(redeemerOf("redeemed-by-someone")).toStrictEqual({ updated_at: NOW, user_id: null })
    expect(redeemerOf("redeemed-by-owner")).toStrictEqual({ updated_at: NOW, user_id: "user-existing" })
  })

  it("files a redemption left without an account under the owner of its order when nothing is left to claim", async () => {
    sqlite.exec(`update "order" set user_id = 'user-1' where id = 'guest-1'`)

    await expect(claimGuestOrdersForUser({ email: "someone-else@example.com", userId: "user-1" })).resolves.toBe(0)
    expect(redeemerOf("redeemed-as-guest").user_id).toBe("user-1")
  })
})
