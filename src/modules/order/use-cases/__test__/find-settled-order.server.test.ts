import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { findSettledOrder, resolveSettledOrder } from "~/src/modules/order/use-cases/find-settled-order.server"

interface PaymentRow {
  readonly checkoutId: string
  readonly id: string
  readonly status: string
}

const state = vi.hoisted(() => {
  const checkoutLookups: string[] = []
  const rows: { orderRow: { id: string } | undefined; paymentRow: PaymentRow | undefined } = {
    orderRow: { id: "order-1" },
    paymentRow: { checkoutId: "checkout-1", id: "payment-1", status: "succeeded" },
  }

  return { checkoutLookups, rows }
})

vi.mock("cloudflare:workers", () => ({ env: { DB: {} } }))

vi.mock("~/src/modules/order/order.accessors", () => ({
  getOrderByCheckoutId: (checkoutId: string) => {
    state.checkoutLookups.push(checkoutId)

    return Promise.resolve(state.rows.orderRow)
  },
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  getPaymentByTransactionId: () => Promise.resolve(state.rows.paymentRow),
}))

const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})

afterAll(() => {
  consoleInfo.mockRestore()
})

beforeEach(() => {
  vi.clearAllMocks()
  state.checkoutLookups.length = 0
  state.rows.orderRow = { id: "order-1" }
  state.rows.paymentRow = { checkoutId: "checkout-1", id: "payment-1", status: "succeeded" }
})

describe("findSettledOrder", () => {
  it("joins the payment to the order through the checkout id", async () => {
    await expect(findSettledOrder("pi_123")).resolves.toStrictEqual({
      checkoutId: "checkout-1",
      orderId: "order-1",
      paymentId: "payment-1",
      paymentStatus: "succeeded",
    })
    expect(state.checkoutLookups).toStrictEqual(["checkout-1"])
  })

  it("skips the order lookup when there is no payment", async () => {
    state.rows.paymentRow = undefined

    await expect(findSettledOrder("pi_123")).resolves.toBeUndefined()
    expect(state.checkoutLookups).toStrictEqual([])
  })

  it("keeps the payment when the checkout has no order yet", async () => {
    state.rows.orderRow = undefined

    await expect(findSettledOrder("pi_123")).resolves.toStrictEqual({
      checkoutId: "checkout-1",
      orderId: undefined,
      paymentId: "payment-1",
      paymentStatus: "succeeded",
    })
  })
})

describe("resolveSettledOrder", () => {
  it("returns undefined and reports the missing payment", () => {
    expect(resolveSettledOrder(undefined, { id: "order-1" }, "pi_123")).toBeUndefined()
    expect(consoleInfo).toHaveBeenCalledWith("No payment for transaction pi_123; nothing to update.")
  })

  it("projects the payment and order rows onto a settled order", () => {
    const resolved = resolveSettledOrder({ checkoutId: "checkout-1", id: "payment-1", status: "succeeded" }, { id: "order-1" }, "pi_123")

    expect(resolved).toStrictEqual({
      checkoutId: "checkout-1",
      orderId: "order-1",
      paymentId: "payment-1",
      paymentStatus: "succeeded",
    })
    expect(consoleInfo).not.toHaveBeenCalled()
  })

  it("keeps the payment when the order row is missing", () => {
    const resolved = resolveSettledOrder({ checkoutId: "checkout-1", id: "payment-1", status: "requires_capture" }, undefined, "pi_123")

    expect(resolved).toStrictEqual({
      checkoutId: "checkout-1",
      orderId: undefined,
      paymentId: "payment-1",
      paymentStatus: "requires_capture",
    })
  })
})
