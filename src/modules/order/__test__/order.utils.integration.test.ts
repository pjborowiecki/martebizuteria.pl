import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type Order } from "~/src/modules/order/order.types"
import { prepareCancelOrderBatch, prepareRefundBatch, prepareRestockOrderBatch } from "~/src/modules/order/order.utils"

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

const FULL_REFUND: Order["refundInput"] = { fullyRefunded: true, refundedAmount: PAID_AMOUNT, transactionId: "cs_paid" }

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

const readPayment = () =>
  z
    .object({ refunded_amount: z.number(), refunded_at: z.number().nullable(), status: z.string() })
    .parse(sqlite.prepare(`select status, refunded_amount, refunded_at from payment where id = 'payment-1'`).get())

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

describe("prepareRefundBatch against the database", () => {
  it("records a full refund and closes the order, leaving its stock and restock stamp alone", async () => {
    seedOrder("processing", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND))

    const refunded = readPayment()

    expect(refunded).toMatchObject({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(refunded.refunded_at).not.toBeNull()
    expect(readOrder().status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
    expect(readRestockedAt()).toBeNull()
  })

  it("keeps the goods of a delivered order refunded in full out of stock", async () => {
    seedOrder("completed", "delivered")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND))

    expect(readOrder().status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("records a partial refund on the payment alone", async () => {
    seedOrder("processing", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, { ...FULL_REFUND, fullyRefunded: false, refundedAmount: 500 }))

    expect(readPayment()).toMatchObject({ refunded_amount: 500, status: "succeeded" })
    expect(readOrder().status).toBe("processing")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("keeps a cancelled order cancelled and leaves the stock its cancellation returned", async () => {
    seedOrder("cancelled", "cancelled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND))

    expect(readPayment().status).toBe("refunded")
    expect(readOrder()).toMatchObject({ fulfillment_status: "cancelled", status: "cancelled" })
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("leaves the stock of an order a lost dispute already closed", async () => {
    seedOrder("refunded", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND))

    expect(readOrder().status).toBe("refunded")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })

  it("reads the refund the payment had recorded and the order's status before the batch changes them", async () => {
    seedOrder("cancelled", "cancelled")
    sqlite.exec(`update payment set refunded_amount = 500 where id = 'payment-1'`)

    const [recorded] = await db.batch(prepareRefundBatch(SETTLED, FULL_REFUND))

    expect(recorded).toStrictEqual([{ orderStatus: "cancelled", paymentStatus: "succeeded", refundedAmount: 500 }])
    expect(readPayment()).toMatchObject({ refunded_amount: PAID_AMOUNT, status: "refunded" })
  })

  it("keeps the larger refund the payment recorded when an older refund event arrives after it", async () => {
    seedOrder("processing", "not_fulfilled")
    sqlite.exec(`update payment set refunded_amount = 30000 where id = 'payment-1'`)

    const [recorded] = await db.batch(prepareRefundBatch(SETTLED, { ...FULL_REFUND, fullyRefunded: false, refundedAmount: 10_000 }))

    expect(recorded).toStrictEqual([{ orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 30_000 }])
    expect(readPayment()).toMatchObject({ refunded_amount: 30_000, status: "succeeded" })
  })

  it("leaves a payment refunded in full untouched when an older partial refund event read it first and arrives after", async () => {
    seedOrder("processing", "not_fulfilled")
    await runDrizzleBatch(prepareRefundBatch(SETTLED, FULL_REFUND))
    const refunded = readPayment()

    const [recorded] = await db.batch(prepareRefundBatch(SETTLED, { ...FULL_REFUND, fullyRefunded: false, refundedAmount: 500 }))

    expect(recorded).toStrictEqual([{ orderStatus: "refunded", paymentStatus: "refunded", refundedAmount: PAID_AMOUNT }])
    expect(readPayment()).toStrictEqual(refunded)
    expect(refunded).toMatchObject({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(readOrder().status).toBe("refunded")
  })

  it("records a refund whose payment has no order on the payment alone", async () => {
    seedOrder("processing", "not_fulfilled")

    await runDrizzleBatch(prepareRefundBatch({ ...SETTLED, orderId: undefined }, FULL_REFUND))

    expect(readPayment().status).toBe("refunded")
    expect(readOrder().status).toBe("processing")
    expect(readStock()).toStrictEqual(STOCK_BEFORE)
  })
})
