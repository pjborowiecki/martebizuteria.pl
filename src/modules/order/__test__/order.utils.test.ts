import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { resolveSettledOrder } from "~/src/modules/order/order.utils"

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))

describe("resolveSettledOrder", () => {
  const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    consoleInfo.mockRestore()
  })

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
