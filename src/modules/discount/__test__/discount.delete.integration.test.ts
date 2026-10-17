import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"
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

const { applyMigrationHistory } = await import("~/src/platform/testing/mocks/migrations")
const { deleteDiscountsByIds, getAdminDiscountStats } = await import("~/src/modules/discount/discount.accessors")

const NOW = new Date(Date.UTC(2026, 5, 1, 12))

const readOrders = () =>
  z
    .array(z.object({ discount_id: z.string().nullable(), discount_total: z.number(), id: z.string(), total: z.number() }))
    .parse(sqlite.prepare(`select id, discount_id, discount_total, total from "order" order by id`).all())

beforeAll(async () => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into discount (id, code, type, value, usage_count) values
      ('discount-spring', 'SPRING', 'percentage', 10, 1),
      ('discount-summer', 'SUMMER', 'fixed_amount', 2000, 1);
    insert into "order" (id, email, discount_id, discount_total, total) values
      ('order-spring', 'ada@marte.test', 'discount-spring', 2490, 22410),
      ('order-summer', 'grace@marte.test', 'discount-summer', 2000, 18000);
    insert into discount_redemption (id, discount_id, order_id, email, amount, created_at, updated_at) values
      ('redemption-spring', 'discount-spring', 'order-spring', 'ada@marte.test', 2490, 0, 0),
      ('redemption-summer', 'discount-summer', 'order-summer', 'grace@marte.test', 2000, 0, 0);
  `)
  await deleteDiscountsByIds(["discount-spring"])
})

afterAll(() => {
  sqlite.close()
})

describe("deleting a code that orders already used", () => {
  it("leaves those orders with the discount and the total they were charged", () => {
    expect(readOrders()).toStrictEqual([
      { discount_id: "discount-spring", discount_total: 2490, id: "order-spring", total: 22_410 },
      { discount_id: "discount-summer", discount_total: 2000, id: "order-summer", total: 18_000 },
    ])
  })

  it("takes its uses out of the redemption and given-away statistics", async () => {
    await expect(getAdminDiscountStats(NOW)).resolves.toMatchObject({ redeemedTotalMinorUnits: 2000, redemptions: 1, total: 1 })
  })
})
