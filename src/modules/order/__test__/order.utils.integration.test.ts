import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type Order } from "~/src/modules/order/order.types"
import { prepareCancelOrderBatch, prepareRefundBatch } from "~/src/modules/order/order.utils"

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

const ORDER_ID = "order-1"

const PAID_AMOUNT = 38_900

const LINES = [
  { quantity: 1, variantId: "variant-ring" },
  { quantity: 2, variantId: "variant-chain" },
]

const STOCK_BEFORE = { "variant-chain": 3, "variant-ring": 0 }

const STOCK_RETURNED = { "variant-chain": 5, "variant-ring": 1 }

const SETTLED: Order["settled"] = { checkoutId: "checkout-1", orderId: ORDER_ID, paymentId: "payment-1", paymentStatus: "succeeded" }

const FULL_REFUND: Order["refundInput"] = { fullyRefunded: true, refundedAmount: PAID_AMOUNT, restock: true, transactionId: "cs_paid" }

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

const readPayment = () =>
  z
    .object({ refunded_amount: z.number(), refunded_at: z.number().nullable(), status: z.string() })
    .parse(sqlite.prepare(`select status, refunded_amount, refunded_at from payment where id = 'payment-1'`).get())

const runCancelBatch = async (): Promise<unknown> => {
  const [first, ...rest] = prepareCancelOrderBatch(ORDER_ID, LINES)
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

  it("returns each line to the stock of its own variant", async () => {
    await runCancelBatch()

    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it.each<[Order["select"]["status"], Order["select"]["fulfillmentStatus"]]>([
    ["processing", "shipped"],
    ["completed", "delivered"],
    ["cancelled", "cancelled"],
    ["refunded", "not_fulfilled"],
  ])("leaves a %s order that is %s, and its stock, untouched", async (status, fulfillmentStatus) => {
    seedOrder(status, fulfillmentStatus)

    await expect(runCancelBatch()).resolves.toStrictEqual([])

    expect(readOrder()).toStrictEqual({ canceled_at: null, fulfillment_status: fulfillmentStatus, status })
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("returns the stock of an order cancelled twice only once", async () => {
    await runCancelBatch()

    await expect(runCancelBatch()).resolves.toStrictEqual([])
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })
})

describe("prepareRefundBatch against the database", () => {
  it("records a full refund, closes the order and returns its stock", async () => {
    seedOrder("processing", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND, LINES))

    const refunded = readPayment()

    expect(refunded).toMatchObject({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(refunded.refunded_at).not.toBeNull()
    expect(readOrder().status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("returns the stock of a delivered order refunded in full, as before", async () => {
    seedOrder("completed", "delivered")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND, LINES))

    expect(readOrder().status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_RETURNED)
  })

  it("records a partial refund on the payment alone", async () => {
    seedOrder("processing", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, { ...FULL_REFUND, fullyRefunded: false, refundedAmount: 500 }, LINES))

    expect(readPayment()).toMatchObject({ refunded_amount: 500, status: "succeeded" })
    expect(readOrder().status).toBe("processing")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("keeps a cancelled order cancelled and leaves the stock its cancellation returned", async () => {
    seedOrder("cancelled", "cancelled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND, LINES))

    expect(readPayment().status).toBe("refunded")
    expect(readOrder()).toMatchObject({ fulfillment_status: "cancelled", status: "cancelled" })
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("leaves the stock of an order a lost dispute already closed", async () => {
    seedOrder("refunded", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND, LINES))

    expect(readOrder().status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("reads the refund the payment had recorded and the order's status before the batch changes them", async () => {
    seedOrder("cancelled", "cancelled")
    sqlite.exec(`update payment set refunded_amount = 500 where id = 'payment-1'`)

    const [recorded] = await db.batch(prepareRefundBatch(SETTLED, FULL_REFUND, LINES))

    expect(recorded).toStrictEqual([{ orderStatus: "cancelled", refundedAmount: 500 }])
    expect(readPayment()).toMatchObject({ refunded_amount: PAID_AMOUNT, status: "refunded" })
  })

  it("keeps the larger refund the payment recorded when an older refund event arrives after it", async () => {
    seedOrder("processing", "not_fulfilled")
    sqlite.exec(`update payment set refunded_amount = 30000 where id = 'payment-1'`)

    const [recorded] = await db.batch(prepareRefundBatch(SETTLED, { ...FULL_REFUND, fullyRefunded: false, refundedAmount: 10_000 }, LINES))

    expect(recorded).toStrictEqual([{ orderStatus: "processing", refundedAmount: 30_000 }])
    expect(readPayment()).toMatchObject({ refunded_amount: 30_000, status: "succeeded" })
  })

  it("records a refund whose payment has no order on the payment alone", async () => {
    seedOrder("processing", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch({ ...SETTLED, orderId: undefined }, FULL_REFUND, LINES))

    expect(readPayment().status).toBe("refunded")
    expect(readOrder().status).toBe("processing")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })
})
