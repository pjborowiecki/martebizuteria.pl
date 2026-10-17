import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

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

const { runDrizzleBatch } = await import("~/src/integrations/drizzle-orm/drizzle.batch")
const { applyMigrationHistory } = await import("~/src/platform/testing/mocks/migrations")
const { prepareDiscountRedemption } = await import("~/src/modules/discount/discount.redeem.server")

const EPOCH = Date.UTC(2026, 0, 1)

const NOW = Date.UTC(2026, 5, 1, 12)

const REDEMPTION = {
  checkoutId: "chk-ada",
  email: "ada@marte.test",
  orderId: "order-1",
  redeemed: { amountMinorUnits: 3000, discountId: "discount-1" },
}

const usageOf = (discountId: string) =>
  z
    .object({ updated_at: z.number(), usage_count: z.number() })
    .parse(sqlite.prepare(`select usage_count, updated_at from discount where id = ?`).get(discountId))

const redemptionsOf = (discountId: string) =>
  sqlite.prepare(`select amount, discount_id, email, order_id, user_id from discount_redemption where discount_id = ?`).all(discountId)

const claimsOf = (checkoutId: string) => sqlite.prepare("select discount_id from discount_claim where checkout_id = ?").all(checkoutId)

applyMigrationHistory(sqlite)

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  sqlite.exec(`
    delete from discount_claim;
    delete from discount_redemption;
    delete from "order";
    delete from checkout;
    delete from discount;
    delete from user;
    insert into user (id, name, email, email_verified, created_at, updated_at) values ('user-1', 'Ada', 'ada@marte.test', 1, ${EPOCH}, ${EPOCH});
    insert into discount (id, code, type, value, usage_count, created_at, updated_at) values
      ('discount-1', 'SPRING-24', 'percentage', 15, 4, ${EPOCH}, ${EPOCH}),
      ('discount-2', 'SUMMER-25', 'percentage', 10, 0, ${EPOCH}, ${EPOCH});
    insert into checkout (id, email, status) values ('chk-ada', 'ada@marte.test', 'pending'), ('chk-grace', 'grace@marte.test', 'pending');
    insert into "order" (id, email, user_id) values ('order-1', 'ada@marte.test', 'user-1'), ('order-guest', 'grace@marte.test', null);
    insert into discount_claim (id, checkout_id, discount_id, email) values
      ('claim-ada', 'chk-ada', 'discount-1', 'ada@marte.test'),
      ('claim-ada-stale', 'chk-ada', 'discount-2', 'ada@marte.test'),
      ('claim-grace', 'chk-grace', 'discount-1', 'grace@marte.test');
  `)
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(() => {
  sqlite.close()
})

describe("prepareDiscountRedemption", () => {
  it("records who redeemed the code on which order and for how much, under the account the order belongs to", async () => {
    await runDrizzleBatch(prepareDiscountRedemption(REDEMPTION))

    expect(redemptionsOf("discount-1")).toEqual([
      { amount: 3000, discount_id: "discount-1", email: "ada@marte.test", order_id: "order-1", user_id: "user-1" },
    ])
  })

  it("records the redemption of a guest order without an account", async () => {
    await runDrizzleBatch(prepareDiscountRedemption({ ...REDEMPTION, email: "grace@marte.test", orderId: "order-guest" }))

    expect(redemptionsOf("discount-1")).toMatchObject([{ order_id: "order-guest", user_id: null }])
  })

  it("counts the use against the discount and stamps when it changed", async () => {
    await runDrizzleBatch(prepareDiscountRedemption(REDEMPTION))

    expect(usageOf("discount-1")).toStrictEqual({ updated_at: NOW, usage_count: 5 })
    expect(usageOf("discount-2")).toStrictEqual({ updated_at: EPOCH, usage_count: 0 })
  })

  it("turns the checkout's hold into the redemption and lets go of every other hold it kept", async () => {
    await runDrizzleBatch(prepareDiscountRedemption(REDEMPTION))

    expect(claimsOf("chk-ada")).toStrictEqual([])
    expect(claimsOf("chk-grace")).toEqual([{ discount_id: "discount-1" }])
  })

  it("lets go of the checkout's holds and records nothing when the order carries no discount", async () => {
    await runDrizzleBatch(prepareDiscountRedemption({ ...REDEMPTION, redeemed: undefined }))

    expect(claimsOf("chk-ada")).toStrictEqual([])
    expect(redemptionsOf("discount-1")).toStrictEqual([])
    expect(usageOf("discount-1").usage_count).toBe(4)
  })

  it("records the use even after the code's limits were reached, because the customer has already paid", async () => {
    sqlite.exec("update discount set usage_limit = 4, per_customer_limit = 1 where id = 'discount-1'")
    sqlite.exec(`
      insert into discount_redemption (id, discount_id, email, amount, created_at, updated_at)
        values ('redemption-earlier', 'discount-1', 'ada@marte.test', 3000, ${EPOCH}, ${EPOCH})
    `)

    await runDrizzleBatch(prepareDiscountRedemption(REDEMPTION))

    expect(redemptionsOf("discount-1")).toHaveLength(2)
    expect(usageOf("discount-1").usage_count).toBe(5)
  })

  it("still runs, writing no redemption, for a code deleted while the customer paid", async () => {
    sqlite.exec("delete from discount where id = 'discount-1'")

    await expect(runDrizzleBatch(prepareDiscountRedemption(REDEMPTION))).resolves.toBeUndefined()
    expect(sqlite.prepare("select count(*) as total from discount_redemption").get()).toEqual({ total: 0 })
    expect(claimsOf("chk-ada")).toStrictEqual([])
  })
})
