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
}

const {
  findPendingCheckoutByTransaction,
  getCheckoutForFulfillment,
  getOrderByCheckoutId,
  prepareDiscountRedemption,
  prepareFulfillCheckoutBatch,
  recordDiscountRedeemedAudit,
  recordOrderPlacedAudit,
  runDrizzleBatch,
} = vi.hoisted(() => ({
  findPendingCheckoutByTransaction: vi.fn<(transactionId: string) => Promise<PendingContext | undefined>>(),
  getCheckoutForFulfillment: vi.fn<(checkoutId: string) => Promise<Record<string, unknown> | undefined>>(),
  getOrderByCheckoutId: vi.fn<(checkoutId: string) => Promise<{ id: string; status: string } | undefined>>(),
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
  recordOrderPlacedAudit: vi.fn<(orderId: string, options: { detail: string; resourceId: string }) => void>(),
  runDrizzleBatch: vi.fn<(statements: readonly string[]) => Promise<void>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.batch", () => ({ runDrizzleBatch }))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutForFulfillment }))
vi.mock("~/src/modules/checkout/checkout.pending.server", () => ({ findPendingCheckoutByTransaction }))
vi.mock("~/src/modules/checkout/checkout.utils", () => ({ prepareFulfillCheckoutBatch }))
vi.mock("~/src/modules/audit-log/use-cases/record-order-audit.server", () => ({
  recordDiscountRedeemedAudit,
  recordOrderPlacedAudit,
}))
vi.mock("~/src/modules/discount/use-cases/redeem-discount.server", () => ({ prepareDiscountRedemption }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderByCheckoutId }))

import { type FulfillCheckoutFromSessionInput, fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"

const input: FulfillCheckoutFromSessionInput = {
  currency: "pln",
  lines: [{ price: 10_000, qty: 2, title: "Silver ring", variantId: "v-1" }],
  locale: "en-US",
  paidAmount: 21_500,
  transactionId: "pi_123",
}

const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})

const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

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
  getOrderByCheckoutId.mockResolvedValue(undefined)
})

describe("fulfillCheckout audit of the placed order", () => {
  it("records the placed order under the e-mail the checkout carries once the batch has run", async () => {
    await fulfillCheckout(input)

    expect(recordOrderPlacedAudit).toHaveBeenCalledExactlyOnceWith("order-1", { detail: "buyer@example.com", resourceId: "order-1" })
  })
})

describe("fulfillCheckout delivery charge", () => {
  it("takes shipping from the delivery method rather than inferring it from the paid amount", async () => {
    await fulfillCheckout(input)

    expect(batchInput()?.totals).toMatchObject({ shippingTotal: 1500, subtotal: 20_000, total: 21_500 })
  })

  it("takes the delivery charge the session was priced with, so free delivery stays free", async () => {
    await fulfillCheckout({ ...input, paidAmount: 20_000, shippingTotal: 0 })

    expect(batchInput()?.totals).toMatchObject({ shippingTotal: 0, subtotal: 20_000, total: 20_000 })
  })

  it("treats a checkout with no delivery method as free shipping", async () => {
    getCheckoutForFulfillment.mockResolvedValue({ ...checkoutRow, deliveryMethod: null })
    await fulfillCheckout({ ...input, paidAmount: 20_000 })

    expect(batchInput()?.totals).toMatchObject({ shippingTotal: 0, total: 20_000 })
  })
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

  it("carves VAT out of the gross total instead of adding it on top", async () => {
    await fulfillCheckout(input)

    expect(batchInput()?.totals["taxTotal"]).toBe(4020)
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
    expect(getOrderByCheckoutId).toHaveBeenCalledExactlyOnceWith("chk-1")
  })
})

describe("fulfillCheckout discount the session was priced with", () => {
  it("records what Stripe took off although the code was changed while the shopper paid", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    getCheckoutForFulfillment.mockResolvedValue(discountedCheckoutRow)

    await fulfillCheckout({ ...input, discountTotal: 3000, paidAmount: 18_500, shippingTotal: 1500 })

    expect(batchInput()?.totals).toMatchObject({ discountTotal: 3000, total: 18_500 })
    expect(prepareDiscountRedemption).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ redeemed: { amountMinorUnits: 3000, discountId: "disc-1" } }),
    )
    expect(recordDiscountRedeemedAudit).toHaveBeenCalledExactlyOnceWith("order-1", { detail: "3000" })
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it("keeps the discount Stripe took off for a code deleted while the shopper paid", async () => {
    getCheckoutForFulfillment.mockResolvedValue({ ...checkoutRow, discountId: "disc-1" })

    await fulfillCheckout({ ...input, discountTotal: 2000, paidAmount: 19_500 })

    expect(batchInput()?.totals).toMatchObject({ discountTotal: 2000, total: 19_500 })
    expect(prepareDiscountRedemption).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ redeemed: { amountMinorUnits: 2000, discountId: "disc-1" } }),
    )
  })

  it("records no discount and no use for a session priced without one", async () => {
    getCheckoutForFulfillment.mockResolvedValue(discountedCheckoutRow)

    await fulfillCheckout({ ...input, discountTotal: 0 })

    expect(batchInput()?.totals).toMatchObject({ discountTotal: 0, total: 21_500 })
    expect(prepareDiscountRedemption).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ redeemed: undefined }))
    expect(recordDiscountRedeemedAudit).not.toHaveBeenCalled()
  })
})

describe("fulfillCheckout when the order cannot be looked up after a failed batch", () => {
  it("surfaces the batch's own error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const lookupError = new Error("D1_ERROR: lookup timed out")
    runDrizzleBatch.mockRejectedValue(new Error("D1_ERROR: SQLITE_BUSY"))
    getOrderByCheckoutId.mockRejectedValue(lookupError)

    await expect(fulfillCheckout(input)).rejects.toThrow("D1_ERROR: SQLITE_BUSY")
    expect(error).toHaveBeenCalledExactlyOnceWith("Could not look up the order of checkout chk-1:", lookupError)
    error.mockRestore()
  })
})

describe("fulfillCheckout when D1 reports an error after committing its batch", () => {
  const lostResponse = new Error("D1_ERROR: Network connection lost.")

  beforeEach(() => {
    runDrizzleBatch.mockRejectedValue(lostResponse)
    getOrderByCheckoutId.mockResolvedValue({ id: "order-1", status: "processing" })
  })

  it("returns the order its own batch wrote, so the order is announced", async () => {
    await expect(fulfillCheckout(input)).resolves.toBe("order-1")
    expect(consoleWarn).toHaveBeenCalledExactlyOnceWith(
      "Checkout chk-1 became Order order-1 although its batch reported an error:",
      lostResponse,
    )
    expect(consoleInfo).not.toHaveBeenCalled()
  })

  it("audits the redemption its own batch recorded", async () => {
    getCheckoutForFulfillment.mockResolvedValue(discountedCheckoutRow)

    await expect(fulfillCheckout({ ...input, paidAmount: 19_500 })).resolves.toBe("order-1")
    expect(recordDiscountRedeemedAudit).toHaveBeenCalledExactlyOnceWith("order-1", { detail: "2000" })
  })
})

describe("fulfillCheckout racing another delivery of the same payment", () => {
  const uniqueCheckoutConflict = new Error(
    "D1_ERROR: UNIQUE constraint failed: order.checkout_id: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_UNIQUE)",
  )

  beforeEach(() => {
    runDrizzleBatch.mockRejectedValue(uniqueCheckoutConflict)
    getOrderByCheckoutId.mockResolvedValue({ id: "order-placed", status: "processing" })
  })

  it("treats the checkout as fulfilled when the other delivery already placed its order", async () => {
    await expect(fulfillCheckout(input)).resolves.toBeUndefined()
    expect(consoleInfo).toHaveBeenCalledWith("Checkout chk-1 already became Order order-placed through another delivery of pi_123.")
    expect(recordOrderPlacedAudit).not.toHaveBeenCalled()
  })

  it("audits no redemption for the batch that lost the race", async () => {
    getCheckoutForFulfillment.mockResolvedValue(discountedCheckoutRow)

    await expect(fulfillCheckout({ ...input, paidAmount: 19_500 })).resolves.toBeUndefined()
    expect(recordDiscountRedeemedAudit).not.toHaveBeenCalled()
  })
})
