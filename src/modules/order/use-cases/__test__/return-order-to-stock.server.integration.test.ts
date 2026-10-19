import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type Order } from "~/src/modules/order/order.types"
import { prepareCancelOrderBatch } from "~/src/modules/order/use-cases/cancel-order.server"
import { prepareRestockOrderBatch } from "~/src/modules/order/use-cases/return-order-to-stock.server"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderRestockedAudit: vi.fn() }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const ORDER_ID = "order-1"

const PAID_AMOUNT = 38_900

const LINES = [
  { quantity: 1, variantId: "variant-ring" },
  { quantity: 2, variantId: "variant-chain" },
]

const STOCK_BEFORE = { "variant-chain": 3, "variant-ring": 0 }

const STOCK_RETURNED = { "variant-chain": 5, "variant-ring": 1 }

const seedOrder = (status: Order["select"]["status"], fulfillmentStatus: Order["select"]["fulfillmentStatus"]): void => {
  sqlite.exec(`
    delete from order_item;
    delete from "order";
    delete from payment;
    delete from checkout;
    update inventory set quantity_available = 3 where variant_id = 'variant-chain';
    update inventory set quantity_available = 0 where variant_id = 'variant-ring';
    insert into checkout (id, email, status) values ('checkout-1', 'ada@marte.test', 'completed');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id)
      values ('payment-1', 'checkout-1', ${String(PAID_AMOUNT)}, 'stripe', 'succeeded', 'cs_paid');
  `)
  sqlite
    .prepare(
      `insert into "order" (id, checkout_id, payment_id, email, order_number, status, fulfillment_status, total)
       values (?, 'checkout-1', 'payment-1', 'ada@marte.test', 'MRT-2026-00001', ?, ?, ?)`,
    )
    .run(ORDER_ID, status, fulfillmentStatus, PAID_AMOUNT)
}

const stockRowsSchema = z.array(z.object({ quantity_available: z.number(), variant_id: z.string() }))

const readStock = (): Record<string, number> => {
  const rows = stockRowsSchema.parse(sqlite.prepare(`select variant_id, quantity_available from inventory order by variant_id`).all())

  return Object.fromEntries(rows.map((row) => [row.variant_id, row.quantity_available]))
}

const readOrder = () =>
  z
    .object({ canceled_at: z.number().nullable(), fulfillment_status: z.string(), status: z.string() })
    .parse(sqlite.prepare(`select status, fulfillment_status, canceled_at from "order" where id = ?`).get(ORDER_ID))

const readRestockedAt = () =>
  z.object({ restocked_at: z.number().nullable() }).parse(sqlite.prepare(`select restocked_at from "order" where id = ?`).get(ORDER_ID))
    .restocked_at

const runCancelBatch = async (): Promise<unknown> => {
  const [first, ...rest] = prepareCancelOrderBatch(ORDER_ID, LINES)
  const results = await db.batch([first, ...rest])

  return results.at(-1)
}

const runRestockBatch = async (): Promise<unknown> => {
  const [first, ...rest] = prepareRestockOrderBatch(ORDER_ID, LINES)
  const results = await db.batch([first, ...rest])

  return results.at(-1)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into product (id, handle, status, titles) values ('product-1', 'aura', 'published', '{"en-US":"Aura"}');
    insert into product_variant (id, product_id, title) values ('variant-ring', 'product-1', 'Ring'), ('variant-chain', 'product-1', 'Chain');
    insert into inventory (id, variant_id, quantity_available) values ('inventory-ring', 'variant-ring', 0), ('inventory-chain', 'variant-chain', 3);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("prepareRestockOrderBatch against the database", () => {
  it.each<[Order["select"]["status"], Order["select"]["fulfillmentStatus"]]>([
    ["refunded", "delivered"],
    ["processing", "shipped"],
    ["completed", "delivered"],
    ["processing", "not_fulfilled"],
  ])("returns the lines of a %s order that is %s to stock and names it in the batch's last result", async (status, fulfillmentStatus) => {
    seedOrder(status, fulfillmentStatus)

    await expect(runRestockBatch()).resolves.toStrictEqual([{ id: ORDER_ID }])

    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(readRestockedAt()).not.toBeNull()
    expect(readOrder()).toMatchObject({ fulfillment_status: fulfillmentStatus, status })
  })

  it("returns an order's stock only once, however often it is asked", async () => {
    seedOrder("refunded", "delivered")

    await runRestockBatch()

    await expect(runRestockBatch()).resolves.toStrictEqual([])
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("leaves the stock its cancellation returned when a cancelled order is asked again", async () => {
    seedOrder("processing", "not_fulfilled")
    await runCancelBatch()

    await expect(runRestockBatch()).resolves.toStrictEqual([])
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("never returns the stock of a cancelled order, even one with no restock recorded", async () => {
    seedOrder("cancelled", "cancelled")

    await expect(runRestockBatch()).resolves.toStrictEqual([])
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })
})
