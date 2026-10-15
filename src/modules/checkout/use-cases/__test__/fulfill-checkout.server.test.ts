import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface PendingContext {
  checkoutId: string
  email: string
  paymentId: string
  userId: string | null
}

interface DiscountRedemptionInput {
  checkoutId: string
  email: string
  orderId: string
  redeemed: { amountMinorUnits: number; discountId: string } | undefined
  userId: string | null
}

const {
  findPendingCheckoutByTransaction,
  getCheckoutForFulfillment,
  prepareDiscountRedemption,
  prepareFulfillCheckoutBatch,
  recordDiscountRedeemedAudit,
  runDrizzleBatch,
} = vi.hoisted(() => ({
  findPendingCheckoutByTransaction: vi.fn<(transactionId: string) => Promise<PendingContext | undefined>>(),
  getCheckoutForFulfillment: vi.fn<(checkoutId: string) => Promise<Record<string, unknown> | undefined>>(),
  prepareDiscountRedemption: vi.fn<(input: DiscountRedemptionInput) => string[]>(),
  prepareFulfillCheckoutBatch:
    vi.fn<
      (
        context: PendingContext,
        input: { totals: Record<string, number> },
        snapshot: Record<string, unknown>,
      ) => { orderId: string; statements: string[] }
    >(),
  recordDiscountRedeemedAudit: vi.fn<(orderId: string, options: { detail: string }) => void>(),
  runDrizzleBatch: vi.fn<(statements: readonly string[]) => Promise<void>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.batch", () => ({ runDrizzleBatch }))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutForFulfillment }))
vi.mock("~/src/modules/checkout/checkout.pending.server", () => ({ findPendingCheckoutByTransaction }))
vi.mock("~/src/modules/checkout/checkout.utils", () => ({ prepareFulfillCheckoutBatch }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordDiscountRedeemedAudit }))
vi.mock("~/src/modules/discount/discount.redeem.server", () => ({ prepareDiscountRedemption }))

import { type FulfillCheckoutFromSessionInput, fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"

const input: FulfillCheckoutFromSessionInput = {
  currency: "pln",
  lines: [{ price: 10_000, qty: 2, title: "Silver ring", variantId: "v-1" }],
  locale: "en-US",
  paidAmount: 21_500,
  transactionId: "pi_123",
}

const context: PendingContext = { checkoutId: "chk-1", email: "buyer@example.com", paymentId: "pay-1", userId: null }

const shippingAddressRow = {
  address1: "Krucza 12/4",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Ada",
  lastName: "Kowalska",
  phone: "+48512345678",
  postalCode: "00-548",
  province: null,
}

const checkoutRow = {
  billingAddress: shippingAddressRow,
  billingCompanyName: null,
  billingNip: null,
  customerNote: "Gift wrap it",
  deliveryMethod: { price: 1500 },
  deliveryMethodId: "dm-courier",
  discount: null,
  discountId: null,
  lockerId: null,
  lockerPoint: null,
  lockerUnconfirmed: false,
  shippingAddress: shippingAddressRow,
}

const discountedCheckoutRow = {
  ...checkoutRow,
  discount: { id: "disc-1", maxDiscountAmount: null, type: "percentage", value: 10 },
  discountId: "disc-1",
}

const batchInput = () => prepareFulfillCheckoutBatch.mock.calls[0]?.[1]

beforeEach(() => {
  vi.clearAllMocks()
  findPendingCheckoutByTransaction.mockResolvedValue(context)
  getCheckoutForFulfillment.mockResolvedValue(checkoutRow)
  prepareDiscountRedemption.mockReturnValue(["release-claims"])
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
    expect(runDrizzleBatch).toHaveBeenCalledExactlyOnceWith(["stmt-a", "stmt-b", "release-claims"])
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
      billingAddress: shippingAddressRow,
      billingCompanyName: null,
      billingNip: null,
      customerNote: "Gift wrap it",
      deliveryMethodId: "dm-courier",
      discountId: null,
      lockerId: null,
      lockerPoint: null,
      lockerUnconfirmed: false,
      shippingAddress: shippingAddressRow,
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
      billingAddress: undefined,
      billingCompanyName: undefined,
      billingNip: undefined,
      customerNote: undefined,
      deliveryMethodId: undefined,
      discountId: undefined,
      lockerId: undefined,
      lockerPoint: undefined,
      lockerUnconfirmed: undefined,
      shippingAddress: undefined,
    })
  })

  it("applies a discount attached to the checkout and spends it once", async () => {
    getCheckoutForFulfillment.mockResolvedValue({
      ...checkoutRow,
      discount: { id: "disc-1", maxDiscountAmount: null, type: "percentage", value: 10 },
      discountId: "disc-1",
    })
    await fulfillCheckout({ ...input, paidAmount: 19_500 })

    expect(batchInput()?.totals).toMatchObject({ discountTotal: 2000, total: 19_500 })
    expect(prepareDiscountRedemption).toHaveBeenCalledExactlyOnceWith({
      checkoutId: "chk-1",
      email: "buyer@example.com",
      orderId: "order-1",
      redeemed: { amountMinorUnits: 2000, discountId: "disc-1" },
      userId: null,
    })
  })

  it("records the redemption in the batch that creates the order", async () => {
    prepareDiscountRedemption.mockReturnValue(["release-claims", "insert-redemption", "count-use"])
    getCheckoutForFulfillment.mockResolvedValue(discountedCheckoutRow)
    await fulfillCheckout({ ...input, paidAmount: 19_500 })

    expect(runDrizzleBatch).toHaveBeenCalledExactlyOnceWith(["stmt-a", "stmt-b", "release-claims", "insert-redemption", "count-use"])
  })

  it("audits the redemption with the amount saved once the order's batch has run", async () => {
    getCheckoutForFulfillment.mockResolvedValue(discountedCheckoutRow)
    await fulfillCheckout({ ...input, paidAmount: 19_500 })

    expect(recordDiscountRedeemedAudit).toHaveBeenCalledExactlyOnceWith("order-1", { detail: "2000" })
  })

  it("does not audit a redemption whose batch failed", async () => {
    runDrizzleBatch.mockRejectedValue(new Error("D1_ERROR"))
    getCheckoutForFulfillment.mockResolvedValue(discountedCheckoutRow)

    await expect(fulfillCheckout({ ...input, paidAmount: 19_500 })).rejects.toThrow("D1_ERROR")
    expect(recordDiscountRedeemedAudit).not.toHaveBeenCalled()
  })

  it("only lets go of the checkout's discount holds when it carries no code", async () => {
    await fulfillCheckout(input)

    expect(prepareDiscountRedemption).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ redeemed: undefined }))
    expect(recordDiscountRedeemedAudit).not.toHaveBeenCalled()
    expect(batchInput()?.totals).toMatchObject({ discountTotal: 0 })
  })

  it("reports a total that disagrees with what Stripe charged", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    await fulfillCheckout({ ...input, paidAmount: 99_999 })

    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })

  it("does nothing for a checkout another delivery already completed", async () => {
    findPendingCheckoutByTransaction.mockResolvedValue(undefined)

    await expect(fulfillCheckout(input)).resolves.toBeUndefined()
    expect(getCheckoutForFulfillment).not.toHaveBeenCalled()
    expect(prepareFulfillCheckoutBatch).not.toHaveBeenCalled()
    expect(runDrizzleBatch).not.toHaveBeenCalled()
  })

  it("lets a failing batch surface instead of reporting a fulfilled order", async () => {
    runDrizzleBatch.mockRejectedValue(new Error("D1_ERROR"))

    await expect(fulfillCheckout(input)).rejects.toThrow("D1_ERROR")
  })
})
