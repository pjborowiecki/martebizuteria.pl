import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Order } from "~/src/modules/order/order.types"

import { refundOrder } from "../refund-order"

interface RestockLine {
  readonly quantity: number
  readonly variantId: string | null
}

const state = vi.hoisted(() => ({
  orderRow: { status: "processing" } as { status: string } | undefined,
  paymentRow: { checkoutId: "checkout-1", refundedAmount: 0 } as { checkoutId: string; refundedAmount: number } | undefined,
  restockLines: [] as RestockLine[],
  settled: undefined as Order["settled"] | undefined,
}))

const calls = vi.hoisted(() => ({
  audit: vi.fn(),
  batches: [] as unknown[][],
  prepared: [] as { quantity: number; variantId: string }[][],
  restockRequests: [] as string[],
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.batch", () => ({
  runDrizzleBatch: (statements: unknown[]) => {
    calls.batches.push(statements)

    return Promise.resolve(undefined)
  },
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderRefundAudit: calls.audit }))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getOrderByCheckoutId: () => Promise.resolve(state.orderRow),
  getRestockLinesForOrder: (orderId: string) => {
    calls.restockRequests.push(orderId)

    return Promise.resolve(state.restockLines)
  },
}))
vi.mock("~/src/modules/order/order.settled.server", () => ({ findSettledOrder: () => Promise.resolve(state.settled) }))
vi.mock("~/src/modules/order/order.utils", () => ({
  prepareRefundBatch: (
    _settled: Order["settled"],
    _input: Order["refundInput"],
    restockLines: { quantity: number; variantId: string }[],
  ) => {
    calls.prepared.push(restockLines)

    return ["payment-update"]
  },
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({ getPaymentByTransactionId: () => Promise.resolve(state.paymentRow) }))

const input = (overrides: Partial<Order["refundInput"]> = {}): Order["refundInput"] => ({
  fullyRefunded: true,
  refundedAmount: 1999,
  restock: true,
  transactionId: "pi_123",
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  calls.batches.length = 0
  calls.prepared.length = 0
  calls.restockRequests.length = 0
  state.orderRow = { status: "processing" }
  state.paymentRow = { checkoutId: "checkout-1", refundedAmount: 0 }
  state.restockLines = []
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
})

describe("refundOrder restocking", () => {
  it("restocks the order lines for a full refund", async () => {
    state.restockLines = [{ quantity: 2, variantId: "variant-a" }]

    await refundOrder(input())

    expect(calls.restockRequests).toStrictEqual(["order-1"])
    expect(calls.prepared[0]).toStrictEqual([{ quantity: 2, variantId: "variant-a" }])
  })

  it("drops lines whose variant no longer exists", async () => {
    state.restockLines = [
      { quantity: 2, variantId: "variant-a" },
      { quantity: 1, variantId: null },
    ]

    await refundOrder(input())

    expect(calls.prepared[0]).toStrictEqual([{ quantity: 2, variantId: "variant-a" }])
  })

  it("skips restocking when the caller opted out", async () => {
    state.restockLines = [{ quantity: 2, variantId: "variant-a" }]

    await refundOrder(input({ restock: false }))

    expect(calls.restockRequests).toStrictEqual([])
    expect(calls.prepared[0]).toStrictEqual([])
  })

  it("skips restocking for a partial refund", async () => {
    await refundOrder(input({ fullyRefunded: false }))

    expect(calls.restockRequests).toStrictEqual([])
  })

  it("skips restocking when the payment has no order", async () => {
    state.settled = { checkoutId: "checkout-1", orderId: undefined, paymentId: "payment-1", paymentStatus: "succeeded" }

    await refundOrder(input())

    expect(calls.restockRequests).toStrictEqual([])
  })
})

describe("refundOrder audit trail", () => {
  it("runs the prepared batch before recording the refund", async () => {
    await refundOrder(input())

    expect(calls.batches).toStrictEqual([["payment-update"]])
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

  it("skips the audit entry when the payment has no order", async () => {
    state.settled = { checkoutId: "checkout-1", orderId: undefined, paymentId: "payment-1", paymentStatus: "succeeded" }

    await refundOrder(input())

    expect(calls.batches).toHaveLength(1)
    expect(calls.audit).not.toHaveBeenCalled()
  })
})
