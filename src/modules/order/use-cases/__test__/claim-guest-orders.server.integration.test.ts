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

import {
  claimGuestOrdersForUser,
  prepareKeepingDeletedAccountOrdersFromClaims,
} from "~/src/modules/order/use-cases/claim-guest-orders.server"

const NOW = Date.UTC(2026, 0, 10)

const ownerOf = (orderId: string): string | null =>
  z.object({ user_id: z.string().nullable() }).parse(sqlite.prepare(`select user_id from "order" where id = ?`).get(orderId)).user_id

const DAY = 86_400_000

const recordAddressHistory = (rows: readonly (readonly [string, string, number, number | null])[]): void => {
  for (const [userId, email, addedAt, replacedAt] of rows) {
    sqlite
      .prepare("insert into user_email_history (user_id, email, added_at, replaced_at) values (?, ?, ?, ?)")
      .run(userId, email, addedAt, replacedAt)
  }
}

const metadataOf = (orderId: string): string | null =>
  z.object({ metadata: z.string().nullable() }).parse(sqlite.prepare(`select metadata from "order" where id = ?`).get(orderId)).metadata

const redeemerOf = (redemptionId: string) =>
  z
    .object({ updated_at: z.number(), user_id: z.string().nullable() })
    .parse(sqlite.prepare("select user_id, updated_at from discount_redemption where id = ?").get(redemptionId))

beforeEach(() => {
  recordCustomerOrdersClaimedAudit.mockClear()
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists discount_redemption;
    drop table if exists user_email_history;
    create table user_email_history (id integer primary key, user_id text not null, email text not null, added_at integer not null, replaced_at integer);
    create table discount_redemption (id text primary key, order_id text unique, user_id text, updated_at integer not null);
    create table "order" (
      id text primary key, user_id text, email text not null, order_number text not null, metadata text,
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

  it("leaves an order placed while another account held the address to that account", async () => {
    recordAddressHistory([
      ["user-before", "anna@example.com", NOW - DAY, NOW + 1],
      ["user-1", "anna@example.com", NOW + 1, null],
    ])

    await expect(claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })).resolves.toBe(0)
    await expect(claimGuestOrdersForUser({ email: "anna@new.example", userId: "user-before" })).resolves.toBe(2)
    expect(ownerOf("guest-1")).toBe("user-before")
  })

  it("links an order placed with an address the account held then, though it has changed it since", async () => {
    recordAddressHistory([
      ["user-1", "anna@example.com", NOW - DAY, NOW + 1],
      ["user-1", "anna@new.example", NOW + 1, null],
    ])

    await expect(claimGuestOrdersForUser({ email: "anna@new.example", userId: "user-1" })).resolves.toBe(2)
    expect(ownerOf("guest-other")).toBeNull()
  })

  it("leaves an order placed after the account gave the address up to whoever proves it next", async () => {
    recordAddressHistory([
      ["user-before", "anna@example.com", NOW - DAY, NOW],
      ["user-before", "anna@new.example", NOW, null],
    ])

    await expect(claimGuestOrdersForUser({ email: "anna@new.example", userId: "user-before" })).resolves.toBe(0)
    await expect(claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })).resolves.toBe(2)
  })

  it("leaves alone the orders a deleted account placed with an address other than its last one", async () => {
    sqlite.exec(`
      insert into "order" (id, user_id, email, order_number, metadata, created_at, updated_at) values
        ('deleted-old-address', 'user-deleted', 'anna@example.com', 'MRT-2026-00005', '{"locale":"pl-PL"}', ${NOW}, ${NOW}),
        ('deleted-last-address', 'user-deleted', 'Anna@New.example', 'MRT-2026-00006', 'not json', ${NOW}, ${NOW});
    `)

    await prepareKeepingDeletedAccountOrdersFromClaims({ email: " anna@new.example", userId: "user-deleted" })
    sqlite.exec(`update "order" set user_id = null where user_id = 'user-deleted'`)

    expect(metadataOf("deleted-old-address")).toBe('{"locale":"pl-PL","keptFromClaims":true}')
    expect(metadataOf("deleted-last-address")).toBe("not json")
    await expect(claimGuestOrdersForUser({ email: "anna@example.com", userId: "user-1" })).resolves.toBe(2)
    await expect(claimGuestOrdersForUser({ email: "anna@new.example", userId: "user-2" })).resolves.toBe(1)
    expect(ownerOf("deleted-old-address")).toBeNull()
  })

  it("files a redemption left without an account under the owner of its order when nothing is left to claim", async () => {
    sqlite.exec(`update "order" set user_id = 'user-1' where id = 'guest-1'`)

    await expect(claimGuestOrdersForUser({ email: "someone-else@example.com", userId: "user-1" })).resolves.toBe(0)
    expect(redeemerOf("redeemed-as-guest").user_id).toBe("user-1")
  })
})
