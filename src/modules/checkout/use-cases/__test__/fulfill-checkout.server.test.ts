import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface PendingContext {
  checkoutId: string
  paymentId: string
}

const { allocateOrderNumber, findPendingCheckoutByTransaction, getCheckoutForFulfillment, prepareFulfillCheckoutBatch, runDrizzleBatch } =
  vi.hoisted(() => ({
    allocateOrderNumber: vi.fn<() => Promise<string>>(),
    findPendingCheckoutByTransaction: vi.fn<(transactionId: string) => Promise<PendingContext | undefined>>(),
    getCheckoutForFulfillment: vi.fn<(checkoutId: string) => Promise<Record<string, unknown> | undefined>>(),
    prepareFulfillCheckoutBatch:
      vi.fn<
        (
          context: PendingContext,
          input: { orderNumber: string; totals: Record<string, number> },
          snapshot: Record<string, unknown>,
        ) => { orderId: string; statements: string[] }
      >(),
    runDrizzleBatch: vi.fn<(statements: readonly string[]) => Promise<void>>(),
  }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.batch", () => ({ runDrizzleBatch }))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutForFulfillment }))
vi.mock("~/src/modules/checkout/checkout.pending.server", () => ({ findPendingCheckoutByTransaction }))
vi.mock("~/src/modules/checkout/checkout.utils", () => ({ prepareFulfillCheckoutBatch }))
vi.mock("~/src/modules/order/order.number.server", () => ({ allocateOrderNumber }))

import { type FulfillCheckoutFromSessionInput, fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"

const input: FulfillCheckoutFromSessionInput = {
  currency: "pln",
  lines: [{ price: 10_000, qty: 2, title: "Silver ring", variantId: "v-1" }],
  locale: "en-US",
  paidAmount: 21_500,
  transactionId: "pi_123",
}

const context: PendingContext = { checkoutId: "chk-1", paymentId: "pay-1" }

const checkoutRow = {
  billingCompanyName: null,
  billingNip: null,
  customerNote: "Gift wrap it",
  deliveryMethod: { price: 1500 },
  deliveryMethodId: "dm-courier",
  discountId: null,
  lockerId: null,
}

const batchInput = () => prepareFulfillCheckoutBatch.mock.calls[0]?.[1]

beforeEach(() => {
  vi.clearAllMocks()
  findPendingCheckoutByTransaction.mockResolvedValue(context)
  getCheckoutForFulfillment.mockResolvedValue(checkoutRow)
  allocateOrderNumber.mockResolvedValue("MRT-2026-00042")
  prepareFulfillCheckoutBatch.mockReturnValue({ orderId: "order-1", statements: ["stmt-a", "stmt-b"] })
  runDrizzleBatch.mockResolvedValue(undefined)
})

describe("fulfillCheckout", () => {
  it("looks the pending checkout up by the payment transaction", async () => {
    await fulfillCheckout(input)

    expect(findPendingCheckoutByTransaction).toHaveBeenCalledWith("pi_123")
  })

  it("returns the new order id once the batch has run", async () => {
    await expect(fulfillCheckout(input)).resolves.toBe("order-1")
    expect(runDrizzleBatch).toHaveBeenCalledWith(["stmt-a", "stmt-b"])
  })

  it("stamps the order with a freshly allocated number", async () => {
    await fulfillCheckout(input)

    expect(allocateOrderNumber).toHaveBeenCalledOnce()
    expect(batchInput()?.orderNumber).toBe("MRT-2026-00042")
  })

  it("takes shipping from the delivery method rather than inferring it from the paid amount", async () => {
    await fulfillCheckout(input)

    expect(batchInput()?.totals).toMatchObject({ shippingTotal: 1500, subtotal: 20_000, total: 21_500 })
  })

  it("carves VAT out of the gross total instead of adding it on top", async () => {
    await fulfillCheckout(input)

    expect(batchInput()?.totals["taxTotal"]).toBe(4020)
  })

  it("treats a checkout with no delivery method as free shipping", async () => {
    getCheckoutForFulfillment.mockResolvedValue({ ...checkoutRow, deliveryMethod: null })
    await fulfillCheckout({ ...input, paidAmount: 20_000 })

    expect(batchInput()?.totals).toMatchObject({ shippingTotal: 0, total: 20_000 })
  })

  it("carries the stored checkout snapshot onto the order", async () => {
    await fulfillCheckout(input)

    expect(prepareFulfillCheckoutBatch.mock.calls[0]?.[2]).toStrictEqual({
      billingCompanyName: null,
      billingNip: null,
      customerNote: "Gift wrap it",
      deliveryMethodId: "dm-courier",
      discountId: null,
      lockerId: null,
    })
  })

  it("reads the checkout row the pending context points at", async () => {
    await fulfillCheckout(input)

    expect(getCheckoutForFulfillment).toHaveBeenCalledWith("chk-1")
  })

  it("leaves the snapshot fields undefined when the checkout row has gone", async () => {
    getCheckoutForFulfillment.mockResolvedValue(undefined)
    await fulfillCheckout(input)

    expect(prepareFulfillCheckoutBatch.mock.calls[0]?.[2]).toStrictEqual({
      billingCompanyName: undefined,
      billingNip: undefined,
      customerNote: undefined,
      deliveryMethodId: undefined,
      discountId: undefined,
      lockerId: undefined,
    })
  })

  it("reports a total that disagrees with what Stripe charged", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    await fulfillCheckout({ ...input, paidAmount: 99_999 })

    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })

  it("does nothing when no pending checkout matches the transaction", async () => {
    findPendingCheckoutByTransaction.mockResolvedValue(undefined)

    await expect(fulfillCheckout(input)).resolves.toBeUndefined()
    expect(getCheckoutForFulfillment).not.toHaveBeenCalled()
    expect(allocateOrderNumber).not.toHaveBeenCalled()
    expect(prepareFulfillCheckoutBatch).not.toHaveBeenCalled()
    expect(runDrizzleBatch).not.toHaveBeenCalled()
  })

  it("lets a failing batch surface instead of reporting a fulfilled order", async () => {
    runDrizzleBatch.mockRejectedValue(new Error("D1_ERROR"))

    await expect(fulfillCheckout(input)).rejects.toThrow("D1_ERROR")
  })
})
