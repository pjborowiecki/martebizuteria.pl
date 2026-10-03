import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
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

import { recordDiscountRedemption } from "~/src/modules/discount/discount.redeem.server"

const EPOCH = Date.UTC(2026, 0, 1)

const NOW = Date.UTC(2026, 5, 1, 12)

const REDEMPTION = { amount: 3000, discountId: "discount-1", email: "ada@marte.test", orderId: "order-1", userId: "user-1" }

const usageOf = (discountId: string) =>
  z
    .object({ updated_at: z.number(), usage_count: z.number() })
    .parse(sqlite.prepare(`select usage_count, updated_at from discount where id = ?`).get(discountId))

const redemptionsOf = (discountId: string) =>
  sqlite.prepare(`select amount, discount_id, email, order_id, user_id from discount_redemption where discount_id = ?`).all(discountId)

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  sqlite.exec(`
    drop table if exists discount_redemption;
    drop table if exists discount;
    create table discount (
      id text primary key, code text not null unique, type text not null, value integer not null,
      usage_count integer not null default 0, created_at integer not null, updated_at integer not null
    );
    create table discount_redemption (
      id text primary key, discount_id text not null references discount(id) on delete cascade, order_id text, user_id text,
      email text not null, amount integer not null, created_at integer not null, updated_at integer not null
    );
    create unique index discount_redemption_orderId_unique on discount_redemption (order_id);
    insert into discount (id, code, type, value, usage_count, created_at, updated_at) values
      ('discount-1', 'SPRING-24', 'percentage', 15, 4, ${EPOCH}, ${EPOCH}),
      ('discount-2', 'SUMMER-25', 'percentage', 10, 0, ${EPOCH}, ${EPOCH});
  `)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("recordDiscountRedemption", () => {
  it("records who redeemed the code on which order and for how much", async () => {
    await expect(recordDiscountRedemption(REDEMPTION)).resolves.toBe(true)
    expect(redemptionsOf("discount-1")).toMatchObject([
      { amount: 3000, discount_id: "discount-1", email: "ada@marte.test", order_id: "order-1", user_id: "user-1" },
    ])
  })

  it("records a guest redemption without an account", async () => {
    await recordDiscountRedemption({ ...REDEMPTION, userId: null })

    expect(redemptionsOf("discount-1")).toMatchObject([{ user_id: null }])
  })

  it("counts the use against the discount and stamps when it changed", async () => {
    await recordDiscountRedemption(REDEMPTION)

    expect(usageOf("discount-1")).toStrictEqual({ updated_at: NOW, usage_count: 5 })
  })

  it("leaves other discounts' usage alone", async () => {
    await recordDiscountRedemption(REDEMPTION)

    expect(usageOf("discount-2")).toStrictEqual({ updated_at: EPOCH, usage_count: 0 })
  })

  it("ignores a replay for an order that already redeemed a code", async () => {
    await recordDiscountRedemption(REDEMPTION)

    await expect(recordDiscountRedemption({ ...REDEMPTION, amount: 9999 })).resolves.toBe(false)
    expect(redemptionsOf("discount-1")).toHaveLength(1)
    expect(usageOf("discount-1").usage_count).toBe(5)
  })

  it("reports failure and logs it instead of throwing when the redemption cannot be stored", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(recordDiscountRedemption({ ...REDEMPTION, discountId: "discount-deleted" })).resolves.toBe(false)
    expect(log).toHaveBeenCalledWith("Failed to record redemption of discount discount-deleted for order order-1:", expect.any(Error))
    expect(redemptionsOf("discount-deleted")).toHaveLength(0)
  })
})
