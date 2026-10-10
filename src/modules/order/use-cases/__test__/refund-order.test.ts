import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Order } from "~/src/modules/order/order.types"

import { refundOrder } from "../refund-order"

interface RecordedRefund {
  readonly orderStatus: string | null
  readonly paymentStatus: string
  readonly refundedAmount: number
}

const state = vi.hoisted(() => ({
  orderRow: { status: "processing" } as { status: string } | undefined,
  paymentRow: { checkoutId: "checkout-1", refundedAmount: 0 } as { checkoutId: string; refundedAmount: number } | undefined,
  recorded: [] as RecordedRefund[],
  settled: undefined as Order["settled"] | undefined,
}))

const calls = vi.hoisted(() => ({
  audit: vi.fn(),
  batches: [] as unknown[][],
  prepared: [] as Order["refundInput"][],
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    batch: (statements: unknown[]) => {
      calls.batches.push(statements)

      return Promise.resolve([state.recorded])
    },
  },
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderRefundAudit: calls.audit }))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getOrderByCheckoutId: () => Promise.resolve(state.orderRow),
}))
vi.mock("~/src/modules/order/order.settled.server", () => ({ findSettledOrder: () => Promise.resolve(state.settled) }))
vi.mock("~/src/modules/order/order.utils", () => ({
  prepareRefundBatch: (_settled: Order["settled"], input: Order["refundInput"]) => {
    calls.prepared.push(input)

    return ["refund-snapshot", "payment-update"]
  },
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({ getPaymentByTransactionId: () => Promise.resolve(state.paymentRow) }))

const input = (overrides: Partial<Order["refundInput"]> = {}): Order["refundInput"] => ({
  fullyRefunded: true,
  refundedAmount: 1999,
  transactionId: "pi_123",
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  calls.batches.length = 0
  calls.prepared.length = 0
  state.orderRow = { status: "processing" }
  state.paymentRow = { checkoutId: "checkout-1", refundedAmount: 0 }
  state.recorded = [{ orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 0 }]
  state.settled = { checkoutId: "checkout-1", orderId: "order-1", paymentId: "payment-1", paymentStatus: "succeeded" }
})

describe("refundOrder guards", () => {
  it("does nothing for an unknown transaction", async () => {
    state.settled = undefined

    await refundOrder(input())

    expect(calls.batches).toHaveLength(0)
    expect(calls.audit).not.toHaveBeenCalled()
  })

  it("does nothing when the payment was already refunded", async () => {
    state.settled = { checkoutId: "checkout-1", orderId: "order-1", paymentId: "payment-1", paymentStatus: "refunded" }

    await refundOrder(input())

    expect(calls.batches).toHaveLength(0)
  })

  it("records and announces nothing when another event refunded the payment after this one read it", async () => {
    state.recorded = [{ orderStatus: "refunded", paymentStatus: "refunded", refundedAmount: 1999 }]

    await expect(refundOrder(input({ fullyRefunded: false, refundedAmount: 500 }))).resolves.toBeUndefined()
    expect(calls.batches).toHaveLength(1)
    expect(calls.audit).not.toHaveBeenCalled()
  })
})

describe("refundOrder batch", () => {
  it("records the refund the event reports and nothing about stock", async () => {
    await refundOrder(input())

    expect(calls.prepared).toStrictEqual([input()])
  })
})

describe("refundOrder audit trail", () => {
  it("runs the prepared batch before recording the refund", async () => {
    await refundOrder(input())

    expect(calls.batches).toStrictEqual([["refund-snapshot", "payment-update"]])
    expect(calls.audit).toHaveBeenCalledTimes(1)
  })

  it("describes the order and payment status change for a full refund", async () => {
    await refundOrder(input())

    expect(calls.audit).toHaveBeenCalledWith("order-1", {
      detail: "Order status: processing → refunded; Payment status: succeeded → refunded; Refunded amount: 0 → 1999",
      metadata: {
        changed: ["orderStatus", "paymentStatus", "refundedAmount"],
        new: { orderStatus: "refunded", paymentStatus: "refunded", refundedAmount: 1999 },
        old: { orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 0 },
      },
      resourceId: "order-1",
    })
  })

  it("keeps a cancelled order cancelled while recording its payment refunded", async () => {
    state.orderRow = { status: "cancelled" }

    await refundOrder(input())

    expect(calls.audit).toHaveBeenCalledWith("order-1", {
      detail: "Payment status: succeeded → refunded; Refunded amount: 0 → 1999",
      metadata: {
        changed: ["paymentStatus", "refundedAmount"],
        new: { paymentStatus: "refunded", refundedAmount: 1999 },
        old: { paymentStatus: "succeeded", refundedAmount: 0 },
      },
      resourceId: "order-1",
    })
  })

  it("leaves the order status untouched for a partial refund", async () => {
    await refundOrder(input({ fullyRefunded: false, refundedAmount: 500 }))

    expect(calls.audit).toHaveBeenCalledWith("order-1", {
      detail: "Refunded amount: 0 → 500",
      metadata: { changed: ["refundedAmount"], new: { refundedAmount: 500 }, old: { refundedAmount: 0 } },
      resourceId: "order-1",
    })
  })

  it("records no detail when nothing about the refund changed", async () => {
    state.paymentRow = { checkoutId: "checkout-1", refundedAmount: 500 }

    await refundOrder(input({ fullyRefunded: false, refundedAmount: 500 }))

    expect(calls.audit).toHaveBeenCalledWith("order-1", { detail: undefined, metadata: undefined, resourceId: "order-1" })
  })

  it("records no drop in the refunded amount for an older refund delivered after a later one", async () => {
    state.paymentRow = { checkoutId: "checkout-1", refundedAmount: 1500 }

    await refundOrder(input({ fullyRefunded: false, refundedAmount: 500 }))

    expect(calls.audit).toHaveBeenCalledWith("order-1", { detail: undefined, metadata: undefined, resourceId: "order-1" })
  })

  it("records the event's amount when the payment's earlier refund could not be read", async () => {
    state.paymentRow = undefined

    await refundOrder(input({ fullyRefunded: false, refundedAmount: 500 }))

    expect(calls.audit).toHaveBeenCalledWith("order-1", {
      detail: "Refunded amount: undefined → 500",
      metadata: { changed: ["refundedAmount"], new: { refundedAmount: 500 }, old: { refundedAmount: undefined } },
      resourceId: "order-1",
    })
  })

  it("skips the audit entry when the payment has no order", async () => {
    state.settled = { checkoutId: "checkout-1", orderId: undefined, paymentId: "payment-1", paymentStatus: "succeeded" }

    await refundOrder(input())

    expect(calls.batches).toHaveLength(1)
    expect(calls.audit).not.toHaveBeenCalled()
  })
})

describe("refundOrder unannounced refund", () => {
  it("hands back a full refund the batch recorded for an open order", async () => {
    await expect(refundOrder(input())).resolves.toStrictEqual({
      amount: 1999,
      fullyRefunded: true,
      orderId: "order-1",
      refundedTotal: 1999,
    })
  })

  it("hands back only the amount refunded since the refund the payment already recorded", async () => {
    state.recorded = [{ orderStatus: "completed", paymentStatus: "succeeded", refundedAmount: 500 }]

    await expect(refundOrder(input({ fullyRefunded: false, refundedAmount: 1500 }))).resolves.toStrictEqual({
      amount: 1000,
      fullyRefunded: false,
      orderId: "order-1",
      refundedTotal: 1500,
    })
  })

  it("hands back nothing for a redelivered refund the payment already recorded", async () => {
    state.recorded = [{ orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 500 }]

    await expect(refundOrder(input({ fullyRefunded: false, refundedAmount: 500 }))).resolves.toBeUndefined()
  })

  it("hands back nothing for an older refund delivered after a later one", async () => {
    state.recorded = [{ orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 1500 }]

    await expect(refundOrder(input({ fullyRefunded: false, refundedAmount: 500 }))).resolves.toBeUndefined()
  })

  it("hands back nothing for the refund of an order the shop cancelled, which the cancellation already announced", async () => {
    state.recorded = [{ orderStatus: "cancelled", paymentStatus: "succeeded", refundedAmount: 0 }]

    await expect(refundOrder(input())).resolves.toBeUndefined()
    expect(calls.audit).toHaveBeenCalledOnce()
  })

  it("hands back nothing when the payment row was gone by the time the batch ran", async () => {
    state.recorded = []

    await expect(refundOrder(input())).resolves.toBeUndefined()
  })

  it("hands back nothing for a refund whose payment has no order", async () => {
    state.settled = { checkoutId: "checkout-1", orderId: undefined, paymentId: "payment-1", paymentStatus: "succeeded" }

    await expect(refundOrder(input())).resolves.toBeUndefined()
  })

  it("hands back nothing for an already refunded payment", async () => {
    state.settled = { checkoutId: "checkout-1", orderId: "order-1", paymentId: "payment-1", paymentStatus: "refunded" }

    await expect(refundOrder(input())).resolves.toBeUndefined()
  })
})
