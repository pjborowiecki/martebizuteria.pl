import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
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

describe("prepareCancelOrderBatch against the database", () => {
  beforeEach(() => {
    seedOrder("processing", "fulfilled")
  })

  it("cancels an open order, stamps when, and names it in the batch's last result", async () => {
    await expect(runCancelBatch()).resolves.toStrictEqual([{ id: ORDER_ID }])

    const cancelled = readOrder()

    expect(cancelled).toMatchObject({ fulfillment_status: "cancelled", status: "cancelled" })
    expect(cancelled.canceled_at).not.toBeNull()
  })

  it("returns each line to the stock of its own variant and stamps the order restocked", async () => {
    await runCancelBatch()

    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(readRestockedAt()).not.toBeNull()
  })

  it.each<[Order["select"]["status"], Order["select"]["fulfillmentStatus"]]>([
    ["processing", "shipped"],
    ["completed", "delivered"],
    ["cancelled", "cancelled"],
  ])("leaves a %s order that is %s, and its stock, untouched", async (status, fulfillmentStatus) => {
    seedOrder(status, fulfillmentStatus)

    await expect(runCancelBatch()).resolves.toStrictEqual([])

    expect(readOrder()).toStrictEqual({ canceled_at: null, fulfillment_status: fulfillmentStatus, status })
    expect(readRestockedAt()).toBeNull()
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("returns the stock of an unshipped order its own refund closed first, without cancelling it", async () => {
    seedOrder("refunded", "not_fulfilled")

    await expect(runCancelBatch()).resolves.toStrictEqual([])

    expect(readOrder()).toStrictEqual({ canceled_at: null, fulfillment_status: "not_fulfilled", status: "refunded" })
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
    expect(readRestockedAt()).not.toBeNull()
  })

  it("returns the stock of an order cancelled twice only once", async () => {
    await runCancelBatch()

    await expect(runCancelBatch()).resolves.toStrictEqual([])
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("cancels an order whose items a refund already returned without returning them again", async () => {
    await runRestockBatch()

    await expect(runCancelBatch()).resolves.toStrictEqual([{ id: ORDER_ID }])
    expect(readOrder().status).toBe("cancelled")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })
})
