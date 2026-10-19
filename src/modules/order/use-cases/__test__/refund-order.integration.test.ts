import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1RoundTrip } from "~/src/platform/testing/mocks/d1"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { type Order } from "~/src/modules/order/order.types"
import { refundOrder } from "~/src/modules/order/use-cases/refund-order.server"

const { recordRefundAudit, sqlite, trips } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    recordRefundAudit: vi.fn(),
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
vi.mock("~/src/modules/audit-log/use-cases/record-order-audit.server", () => ({
  recordOrderRefundAudit: recordRefundAudit,
}))

const ORDER_ID = "order-1"

const PAID_AMOUNT = 38_900

const FULL_REFUND: Order["refundInput"] = { fullyRefunded: true, refundedAmount: PAID_AMOUNT, transactionId: "cs_paid" }

const EARLIER_PARTIAL_REFUND: Order["refundInput"] = { fullyRefunded: false, refundedAmount: 5000, transactionId: "cs_paid" }

const readPayment = () =>
  z
    .object({ refunded_amount: z.number(), status: z.string() })
    .parse(sqlite.prepare(`select status, refunded_amount from payment where id = 'payment-1'`).get())

const readOrderStatus = (): string =>
  z.object({ status: z.string() }).parse(sqlite.prepare(`select status from "order" where id = ?`).get(ORDER_ID)).status

const countBatches = (): number => trips.filter((trip) => trip.kind === "batch").length

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  trips.splice(0)
  sqlite.exec(`
    delete from "order";
    delete from payment;
    delete from checkout;
    insert into checkout (id, email, status) values ('checkout-1', 'ada@marte.test', 'completed');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id)
      values ('payment-1', 'checkout-1', ${String(PAID_AMOUNT)}, 'stripe', 'succeeded', 'cs_paid');
    insert into "order" (id, checkout_id, payment_id, email, order_number, status, fulfillment_status, total)
      values ('${ORDER_ID}', 'checkout-1', 'payment-1', 'ada@marte.test', 'MRT-2026-00001', 'processing', 'not_fulfilled', ${String(PAID_AMOUNT)});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("refundOrder with an older partial refund event in flight", () => {
  it("keeps the payment refunded when the partial event read it before the full refund was recorded", async () => {
    const outcomes = await Promise.all([refundOrder(FULL_REFUND), refundOrder(EARLIER_PARTIAL_REFUND)])

    expect(countBatches()).toBe(2)
    expect(outcomes).toStrictEqual([{ amount: PAID_AMOUNT, fullyRefunded: true, orderId: ORDER_ID, refundedTotal: PAID_AMOUNT }, undefined])
    expect(readPayment()).toStrictEqual({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(readOrderStatus()).toBe("refunded")
    expect(recordRefundAudit).toHaveBeenCalledOnce()
  })

  it("ignores the partial event once the full refund is recorded", async () => {
    await refundOrder(FULL_REFUND)

    await expect(refundOrder(EARLIER_PARTIAL_REFUND)).resolves.toBeUndefined()
    expect(countBatches()).toBe(1)
    expect(readPayment()).toStrictEqual({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(recordRefundAudit).toHaveBeenCalledOnce()
  })
})
