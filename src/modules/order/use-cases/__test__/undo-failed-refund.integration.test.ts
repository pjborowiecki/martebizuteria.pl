import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { type Order } from "~/src/modules/order/order.types"
import { undoFailedRefund } from "~/src/modules/order/use-cases/undo-failed-refund.server"

const { recordRefundFailedAudit, sqlite, trips } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    recordRefundFailedAudit: vi.fn<(orderId: string, refundId: string, options?: object) => void>(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    trips: [] as TestD1RoundTrip[],
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return {
    db: drizzle(
      createTestD1Database(sqlite, undefined, (trip) => {
        trips.push(trip)
      }),
      { schema },
    ),
  }
})
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderRefundFailedAudit: recordRefundFailedAudit }))

const ORDER_ID = "order-1"

const ORDER_NUMBER = "MRT-2026-00001"

const PAID_AMOUNT = 38_900

const REFUNDED_AT = 1_760_000_000_000

const FAILED_FULL_REFUND: Order["failedRefundInput"] = {
  refund: { amount: PAID_AMOUNT, failureReason: "expired_or_canceled_card", id: "re_full", status: "failed" },
  refundedAmount: 0,
  transactionId: "cs_paid",
}

const seed = ({
  fulfillmentStatus = "not_fulfilled",
  orderStatus,
  paymentStatus,
  refundedAmount,
}: Readonly<{ fulfillmentStatus?: string; orderStatus: string; paymentStatus: string; refundedAmount: number }>): void => {
  sqlite.exec(`
    delete from "order";
    delete from payment;
    delete from checkout;
    insert into checkout (id, email, status) values ('checkout-1', 'ada@marte.test', 'completed');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, refunded_amount, refunded_at)
      values ('payment-1', 'checkout-1', ${String(PAID_AMOUNT)}, 'stripe', '${paymentStatus}', 'cs_paid', ${String(refundedAmount)}, ${String(REFUNDED_AT)});
    insert into "order" (id, checkout_id, payment_id, email, order_number, status, fulfillment_status, total)
      values ('${ORDER_ID}', 'checkout-1', 'payment-1', 'ada@marte.test', '${ORDER_NUMBER}', '${orderStatus}', '${fulfillmentStatus}', ${String(PAID_AMOUNT)});
  `)
}

const readPayment = () =>
  z
    .object({ refunded_amount: z.number(), refunded_at: z.number().nullable(), status: z.string() })
    .parse(sqlite.prepare(`select status, refunded_amount, refunded_at from payment where id = 'payment-1'`).get())

const readOrderStatus = (): string =>
  z.object({ status: z.string() }).parse(sqlite.prepare(`select status from "order" where id = ?`).get(ORDER_ID)).status

const countBatches = (): number => trips.filter((trip) => trip.kind === "batch").length

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  trips.splice(0)
  seed({ orderStatus: "refunded", paymentStatus: "refunded", refundedAmount: PAID_AMOUNT })
})

afterAll(() => {
  sqlite.close()
})

describe("undoFailedRefund", () => {
  it("reopens a fully refunded order whose refund failed and marks its payment paid with nothing refunded", async () => {
    await expect(undoFailedRefund(FAILED_FULL_REFUND)).resolves.toStrictEqual({ orderId: ORDER_ID, orderNumber: ORDER_NUMBER })

    expect(readPayment()).toStrictEqual({ refunded_amount: 0, refunded_at: null, status: "succeeded" })
    expect(readOrderStatus()).toBe("processing")
  })

  it("records the failure against the order once per Stripe refund, with its amount, status and reason", async () => {
    await undoFailedRefund(FAILED_FULL_REFUND)

    expect(recordRefundFailedAudit).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "re_full", {
      detail: `${String(PAID_AMOUNT)} — failed — expired_or_canceled_card`,
      resourceId: ORDER_ID,
    })
  })

  it("records a refund Stripe reports without a reason with its amount and status alone", async () => {
    await undoFailedRefund({
      ...FAILED_FULL_REFUND,
      refund: { ...FAILED_FULL_REFUND.refund, failureReason: undefined, status: "canceled" },
    })

    expect(recordRefundFailedAudit).toHaveBeenCalledWith(ORDER_ID, "re_full", {
      detail: `${String(PAID_AMOUNT)} — canceled`,
      resourceId: ORDER_ID,
    })
  })

  it("reopens a delivered order as completed", async () => {
    seed({ fulfillmentStatus: "delivered", orderStatus: "refunded", paymentStatus: "refunded", refundedAmount: PAID_AMOUNT })

    await undoFailedRefund(FAILED_FULL_REFUND)

    expect(readOrderStatus()).toBe("completed")
  })

  it("keeps the earlier partial refund that still stands, with its date", async () => {
    await undoFailedRefund({ ...FAILED_FULL_REFUND, refundedAmount: 5000 })

    expect(readPayment()).toStrictEqual({ refunded_amount: 5000, refunded_at: REFUNDED_AT, status: "succeeded" })
    expect(readOrderStatus()).toBe("processing")
  })

  it("takes a failed partial refund off an order that stayed open", async () => {
    seed({ orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 5000 })

    await undoFailedRefund({ ...FAILED_FULL_REFUND, refund: { ...FAILED_FULL_REFUND.refund, amount: 5000 } })

    expect(readPayment()).toStrictEqual({ refunded_amount: 0, refunded_at: null, status: "succeeded" })
    expect(readOrderStatus()).toBe("processing")
  })

  it("leaves a cancelled order cancelled while its payment shows the money was not returned", async () => {
    seed({ fulfillmentStatus: "cancelled", orderStatus: "cancelled", paymentStatus: "refunded", refundedAmount: PAID_AMOUNT })

    await undoFailedRefund(FAILED_FULL_REFUND)

    expect(readPayment()).toStrictEqual({ refunded_amount: 0, refunded_at: null, status: "succeeded" })
    expect(readOrderStatus()).toBe("cancelled")
  })

  it("changes nothing more when Stripe delivers the failure again, still naming the same refund", async () => {
    await undoFailedRefund(FAILED_FULL_REFUND)
    await undoFailedRefund(FAILED_FULL_REFUND)

    expect(countBatches()).toBe(1)
    expect(readPayment()).toStrictEqual({ refunded_amount: 0, refunded_at: null, status: "succeeded" })
    expect(recordRefundFailedAudit.mock.calls.map(([orderId, refundId]) => [orderId, refundId])).toStrictEqual([
      [ORDER_ID, "re_full"],
      [ORDER_ID, "re_full"],
    ])
  })

  it("lowers the payment once when refund.failed and refund.updated for one refund arrive together", async () => {
    await Promise.all([undoFailedRefund(FAILED_FULL_REFUND), undoFailedRefund(FAILED_FULL_REFUND)])

    expect(readPayment()).toStrictEqual({ refunded_amount: 0, refunded_at: null, status: "succeeded" })
    expect(readOrderStatus()).toBe("processing")
  })

  it("only records a failure that arrives before the shop recorded its refund, which then never raises the payment", async () => {
    seed({ orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 0 })

    await expect(undoFailedRefund(FAILED_FULL_REFUND)).resolves.toStrictEqual({ orderId: ORDER_ID, orderNumber: ORDER_NUMBER })

    expect(countBatches()).toBe(0)
    expect(readPayment()).toStrictEqual({ refunded_amount: 0, refunded_at: REFUNDED_AT, status: "succeeded" })
    expect(recordRefundFailedAudit).toHaveBeenCalledOnce()
  })

  it("leaves a payment alone while a refund issued again after the failure covers what it records", async () => {
    await undoFailedRefund({ ...FAILED_FULL_REFUND, refundedAmount: PAID_AMOUNT })

    expect(countBatches()).toBe(0)
    expect(readPayment()).toStrictEqual({ refunded_amount: PAID_AMOUNT, refunded_at: REFUNDED_AT, status: "refunded" })
    expect(readOrderStatus()).toBe("refunded")
  })

  it("does nothing for a refund on a payment this shop has no order for", async () => {
    await expect(undoFailedRefund({ ...FAILED_FULL_REFUND, transactionId: "cs_unknown" })).resolves.toBeUndefined()

    expect(countBatches()).toBe(0)
    expect(recordRefundFailedAudit).not.toHaveBeenCalled()
  })
})
