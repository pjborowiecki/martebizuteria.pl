import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn<(params: { metadata: Record<string, string> }) => Promise<unknown>>(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  ensureStripeCustomer: vi.fn<() => Promise<string>>(),
  getOfferedDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  getStripeCustomerId: vi.fn<() => Promise<string | undefined>>(),
  releaseCheckout: vi.fn(),
  reserveInventoryByVariantLines: vi.fn(),
  resolveCheckoutDiscount: vi.fn<() => Promise<{ amountMinorUnits: number; code: string; discountId: string } | undefined>>(),
  scheduleProductCatalogInvalidation: vi.fn(),
  supersedeCheckoutSession: vi.fn(),
  updateCheckoutDelivery: vi.fn(),
}))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocked.getRequest }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: mocked.getRequestSession }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: mocked.scheduleProductCatalogInvalidation,
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mocked.checkoutSessionsCreate,
        expire: mocked.checkoutSessionsExpire,
        retrieve: mocked.checkoutSessionsRetrieve,
      },
    },
  },
}))
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({
  ensureStripeCustomer: mocked.ensureStripeCustomer,
  getStripeCustomerId: mocked.getStripeCustomerId,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/modules/checkout/use-cases/create-checkout.server", () => ({ createCheckout: vi.fn() }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: mocked.releaseCheckout }))
vi.mock("~/src/modules/checkout/use-cases/supersede-checkout-session.server", () => ({
  supersedeCheckoutSession: mocked.supersedeCheckoutSession,
}))
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/discount.checkout.server", () => ({ resolveCheckoutDiscount: mocked.resolveCheckoutDiscount }))
vi.mock("~/src/modules/discount/discount.claim.server", () => ({
  claimCheckoutDiscount: ({ applied }: { applied: unknown }) => Promise.resolve(applied),
  keepClaimedDiscount: vi.fn(),
  releaseDiscountClaims: vi.fn(),
  releaseUnappliedDiscountClaims: vi.fn(),
}))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getOfferedDeliveryMethodByIdQuery: mocked.getOfferedDeliveryMethodByIdQuery,
}))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ releaseInventoryForItems: vi.fn() }))
vi.mock("~/src/modules/inventory/inventory.utils", () => ({
  reserveInventoryByVariantLines: mocked.reserveInventoryByVariantLines,
  reserveInventoryForItems: vi.fn(),
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  createPendingPayment: vi.fn(),
  getPaymentContextByTransactionId: mocked.getPaymentContextByTransactionId,
}))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getPublishedProductsWithInventoryByHandles: mocked.getPublishedProductsWithInventoryByHandles,
}))
vi.mock("~/src/modules/store-setting/store-setting.accessors", () => ({ isSalesPaused: () => Promise.resolve(false) }))
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.server", () => ({ verifyTurnstileToken: () => Promise.resolve() }))
vi.mock("~/src/modules/checkout/use-cases/count-open-checkouts.server", () => ({
  countOpenCheckouts: () => Promise.resolve({ byClientAddress: 0, byEmail: 0 }),
}))
vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: () => "203.0.113.7" }))
vi.mock("~/src/lib/url", () => ({ resolveAssetURL: (source: string) => `https://assets.test/${source}` }))

import {
  CHECKOUT_VALUES,
  HELD_LINES,
  availableVariant,
  catalogueProduct,
  pendingContext,
  requestOn,
  updateInput,
} from "~/src/integrations/stripe/__test__/fixtures/checkout-session-inputs"
import { handleUpdateCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  mocked.getRequest.mockReturnValue(requestOn("http://127.0.0.1:3000"))
  mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1", name: "Anna Kowalska" } })
  mocked.getStripeCustomerId.mockResolvedValue("cus_1")
  mocked.ensureStripeCustomer.mockResolvedValue("cus_1")
  mocked.releaseCheckout.mockResolvedValue(undefined)
  mocked.reserveInventoryByVariantLines.mockResolvedValue(undefined)
  mocked.supersedeCheckoutSession.mockResolvedValue(true)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1500, type: "courier" })
  mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_300, client_secret: "cs_secret_1", id: "cs_new" })
  mocked.checkoutSessionsExpire.mockResolvedValue({})
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ metadata: { items: JSON.stringify(HELD_LINES) }, status: "open" })
  mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext())
  mocked.resolveCheckoutDiscount.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const expectNothingTouched = (): void => {
  expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
  expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
  expect(mocked.reserveInventoryByVariantLines).not.toHaveBeenCalled()
  expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
}

describe("handleUpdateCheckoutSession authorization", () => {
  it("refuses a session id that belongs to no payment as a session the client must replace", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(undefined)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
    expect(mocked.checkoutSessionsRetrieve).not.toHaveBeenCalled()
  })

  it("refuses to update another signed-in customer's checkout and tells the browser to start its own", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-2" } })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
    expect(mocked.checkoutSessionsRetrieve).not.toHaveBeenCalled()
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
  })

  it("refuses an anonymous request against a checkout owned by a user, as after signing out with the session stored", async () => {
    mocked.getRequestSession.mockResolvedValue(undefined)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
  })

  it("refuses another customer's checkout before saying whether it is still open", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-2" } })
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ checkoutStatus: "failed", paymentStatus: "failed" }))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("tells a browser holding another account's paid session that it was paid, as the confirmation page would", async () => {
    mocked.getRequestSession.mockResolvedValue(null)
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ checkoutStatus: "completed", paymentStatus: "succeeded" }))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_COMPLETE,
    })
    expect(mocked.checkoutSessionsRetrieve).not.toHaveBeenCalled()
    expectNothingTouched()
  })

  it("continues a guest's checkout as a guest's while nobody is signed in", async () => {
    mocked.getRequestSession.mockResolvedValue(null)
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ email: "guest@example.com", userId: undefined }))

    await handleUpdateCheckoutSession(updateInput())

    const params = mocked.checkoutSessionsCreate.mock.calls[0]?.[0]

    expect(params).toMatchObject({ customer_email: CHECKOUT_VALUES.email, metadata: { userId: "" } })
    expect(params).not.toHaveProperty("customer")
    expect(mocked.ensureStripeCustomer).not.toHaveBeenCalled()
    expect(mocked.supersedeCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ userId: undefined }))
  })

  it("hands a guest's checkout to the account that signed in while it was held, with that account's Stripe customer", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ email: "guest@example.com", userId: undefined }))

    await expect(handleUpdateCheckoutSession(updateInput())).resolves.toMatchObject({ sessionId: "cs_new" })

    expect(mocked.ensureStripeCustomer).toHaveBeenCalledExactlyOnceWith({
      email: CHECKOUT_VALUES.email,
      name: "Anna Kowalska",
      userId: "user-1",
    })
    expect(mocked.getStripeCustomerId).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0]).toMatchObject({
      customer: "cus_1",
      metadata: { userId: "user-1" },
      saved_payment_method_options: { payment_method_save: "enabled" },
    })
    expect(mocked.supersedeCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ oldTransactionId: "cs_old", userId: "user-1" }))
  })

  it("leaves the guest's checkout and session untouched when Stripe cannot make the account a customer", async () => {
    const failure = new Error("stripe is unreachable")
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ email: "guest@example.com", userId: undefined }))
    mocked.ensureStripeCustomer.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)
    expectNothingTouched()
  })
})

describe("handleUpdateCheckoutSession", () => {
  it("uses the edited checkout email for both the new session and its payment receipt", async () => {
    const input = updateInput({ email: "updated@example.com" })

    await handleUpdateCheckoutSession(input)

    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0]).toMatchObject({
      customer: "cus_1",
      payment_intent_data: { receipt_email: "updated@example.com" },
    })
    expect(mocked.updateCheckoutDelivery).toHaveBeenCalledWith("checkout-1", input.checkoutValues, {
      discountId: undefined,
      lockerUnconfirmed: false,
    })
  })

  it("expires the old session and moves its payment and stock before reserving the edited cart", async () => {
    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.checkoutSessionsRetrieve).toHaveBeenCalledWith("cs_old", { expand: ["payment_intent"] })
    expect(mocked.checkoutSessionsExpire).toHaveBeenCalledExactlyOnceWith("cs_old")
    expect(mocked.supersedeCheckoutSession).toHaveBeenCalledWith({
      amount: 51_300,
      discountId: undefined,
      heldLines: HELD_LINES,
      newTransactionId: "cs_new",
      oldTransactionId: "cs_old",
      reservedLines: [{ qty: 2, variantId: "variant-1" }],
      userId: "user-1",
    })
    expect(mocked.reserveInventoryByVariantLines).toHaveBeenCalledWith([expect.objectContaining({ qty: 2, variantId: "variant-1" })])

    const order = [
      mocked.checkoutSessionsCreate,
      mocked.checkoutSessionsExpire,
      mocked.supersedeCheckoutSession,
      mocked.reserveInventoryByVariantLines,
      mocked.updateCheckoutDelivery,
    ].map((step) => step.mock.invocationCallOrder[0])

    expect(order).toStrictEqual(order.toSorted((left = 0, right = 0) => left - right))
  })

  it("treats a previous session without item metadata as having nothing reserved", async () => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({ metadata: null, status: "open" })

    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.supersedeCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ heldLines: [] }))
  })

  it("returns the replacement session once the delivery change is saved", async () => {
    const result = await handleUpdateCheckoutSession(updateInput())

    expect(mocked.updateCheckoutDelivery).toHaveBeenCalledWith("checkout-1", expect.objectContaining({ deliveryMethod: "dpd-courier" }), {
      discountId: undefined,
      lockerUnconfirmed: false,
    })
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
    expect(result).toStrictEqual({
      amount: 51_300,
      clientSecret: "cs_secret_1",
      lines: [{ qty: 2, unitPrice: 24_900, variantId: "variant-1" }],
      sessionId: "cs_new",
      totals: { discountTotal: 0, shippingTotal: 1500, subtotal: 49_800, taxTotal: 9593, total: 51_300, vatBasisPoints: 2300 },
    })
  })

  it("quotes the replacement at the catalogue price the shop charges now", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), price: 26_900 }])])

    const result = await handleUpdateCheckoutSession(updateInput())

    expect(result.lines).toStrictEqual([{ qty: 2, unitPrice: 26_900, variantId: "variant-1" }])
    expect(result.totals).toMatchObject({ discountTotal: 0, shippingTotal: 1500, subtotal: 53_800, total: 55_300 })
  })

  it("counts the stock its own session holds when checking the edited cart", async () => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({
      metadata: { items: JSON.stringify([{ qty: 1, variantId: "variant-1" }]) },
      status: "open",
    })
    const variant = { ...availableVariant(), inventory: { id: "inventory-1", quantityAvailable: 1 } }
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([variant])])

    await expect(handleUpdateCheckoutSession(updateInput())).resolves.toMatchObject({ sessionId: "cs_new" })
  })

  it("keeps the old session untouched when the edited cart needs more stock than is left", async () => {
    const variant = { ...availableVariant(), inventory: { id: "inventory-1", quantityAvailable: 1 } }
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([variant])])

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY,
    })
    expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
    expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
  })

  it("does not move the payment when the update is rejected by validation", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([])

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })
    expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
    expect(mocked.reserveInventoryByVariantLines).not.toHaveBeenCalled()
  })
})

describe("handleUpdateCheckoutSession on a checkout that can no longer change", () => {
  it.each([
    { checkoutStatus: "failed", paymentStatus: "failed" },
    { checkoutStatus: "failed", paymentStatus: "pending" },
  ])("refuses a $checkoutStatus checkout with a $paymentStatus payment before asking Stripe", async (statuses) => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext(statuses))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
    expect(mocked.checkoutSessionsRetrieve).not.toHaveBeenCalled()
    expectNothingTouched()
  })

  it.each([
    { checkoutStatus: "completed", paymentStatus: "succeeded" },
    { checkoutStatus: "pending", paymentStatus: "succeeded" },
    { checkoutStatus: "completed", paymentStatus: "refunded" },
  ])("reports a $checkoutStatus checkout with a $paymentStatus payment as paid, not closed, before asking Stripe", async (statuses) => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext(statuses))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_COMPLETE,
    })
    expect(mocked.checkoutSessionsRetrieve).not.toHaveBeenCalled()
    expectNothingTouched()
  })

  it("reports a Stripe session paid before its webhook as paid, not closed, and leaves its stock to fulfilment", async () => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "complete" })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_COMPLETE,
    })
    expectNothingTouched()
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
  })

  it.each([
    {
      payment: "a BLIK payment waiting for approval in the banking app",
      paymentIntent: { next_action: { type: "blik_authorize" }, status: "requires_action" },
    },
    { payment: "a payment the bank is still processing", paymentIntent: { next_action: null, status: "processing" } },
  ])("keeps a session with $payment and its stock as they are instead of replacing it", async ({ paymentIntent }) => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({
      id: "cs_old",
      metadata: { items: JSON.stringify(HELD_LINES) },
      payment_intent: paymentIntent,
      status: "open",
    })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_PROCESSING,
    })
    expectNothingTouched()
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
    expect(mocked.getPublishedProductsWithInventoryByHandles).not.toHaveBeenCalled()
    expect(mocked.scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
  })

  it("replaces a session whose 3-D Secure challenge was left behind with the page that showed it", async () => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({
      metadata: { items: JSON.stringify(HELD_LINES) },
      payment_intent: { next_action: { type: "use_stripe_sdk" }, status: "requires_action" },
      status: "open",
    })

    await expect(handleUpdateCheckoutSession(updateInput())).resolves.toMatchObject({ sessionId: "cs_new" })
    expect(mocked.checkoutSessionsExpire).toHaveBeenCalledExactlyOnceWith("cs_old")
  })

  it("returns the stock of a session Stripe has expired before its webhook arrives, so a fresh checkout can take it", async () => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "expired" })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
    expect(mocked.releaseCheckout).toHaveBeenCalledExactlyOnceWith({ lines: HELD_LINES, transactionId: "cs_old" })
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
    expectNothingTouched()
  })

  it("still refuses an expired session when returning its stock fails, leaving the release to the webhook", async () => {
    const failure = new Error("d1 batch failed")
    mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "expired" })
    mocked.releaseCheckout.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
    expect(console.error).toHaveBeenCalledWith("Failed to release expired Checkout Session cs_old ahead of its webhook:", failure)
    expect(mocked.scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
    expectNothingTouched()
  })

  it("discards the replacement when the old session's stock was released before it could be moved", async () => {
    mocked.supersedeCheckoutSession.mockResolvedValue(false)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
    expect(mocked.checkoutSessionsExpire.mock.calls).toStrictEqual([["cs_old"], ["cs_new"]])
    expect(mocked.reserveInventoryByVariantLines).not.toHaveBeenCalled()
    expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
    expect(mocked.scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
  })

  it("discards the replacement and leaves the stock alone when Stripe will not expire the old session", async () => {
    const failure = new Error("This Checkout Session is no longer open")
    mocked.checkoutSessionsExpire.mockRejectedValueOnce(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)
    expect(mocked.checkoutSessionsExpire.mock.calls).toStrictEqual([["cs_old"], ["cs_new"]])
    expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
    expect(mocked.reserveInventoryByVariantLines).not.toHaveBeenCalled()
  })

  it("discards the replacement when moving the payment fails", async () => {
    const failure = new Error("d1 batch failed")
    mocked.supersedeCheckoutSession.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)
    expect(mocked.checkoutSessionsExpire).toHaveBeenLastCalledWith("cs_new")
    expect(mocked.reserveInventoryByVariantLines).not.toHaveBeenCalled()
  })

  it("leaves the old session open when Stripe refuses the replacement", async () => {
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("stripe rejected the session"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toThrow("stripe rejected the session")
    expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
    expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
  })
})

describe("handleUpdateCheckoutSession compensation", () => {
  it("fails the checkout and discards the replacement when the edited cart can no longer be reserved", async () => {
    const failure = new Error("Inventory reservation failed for variant-1. Not enough stock available.")
    mocked.reserveInventoryByVariantLines.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)

    expect(mocked.releaseCheckout).toHaveBeenCalledWith({ lines: [], transactionId: "cs_new" })
    expect(mocked.checkoutSessionsExpire).toHaveBeenLastCalledWith("cs_new")
    expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith("Failed to reserve the edited cart during checkout session update:", failure)
  })

  it("returns the new reservation and fails the checkout when the delivery change cannot be saved", async () => {
    const failure = new Error("delivery update failed")
    mocked.updateCheckoutDelivery.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)

    expect(mocked.releaseCheckout).toHaveBeenCalledWith({
      lines: [expect.objectContaining({ qty: 2, variantId: "variant-1" })],
      transactionId: "cs_new",
    })
    expect(mocked.checkoutSessionsExpire).toHaveBeenLastCalledWith("cs_new")
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith("Failed to save the edited delivery during checkout session update:", failure)
  })

  it("still discards the replacement and rethrows when failing the checkout also fails", async () => {
    const failure = new Error("delivery update failed")
    mocked.updateCheckoutDelivery.mockRejectedValue(failure)
    mocked.releaseCheckout.mockRejectedValue(new Error("release failed"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)

    expect(mocked.checkoutSessionsExpire).toHaveBeenLastCalledWith("cs_new")
    expect(console.error).toHaveBeenCalledWith("Failed to release checkout after checkout update error:", expect.any(Error))
  })

  it("logs a replacement session that Stripe will not expire", async () => {
    mocked.updateCheckoutDelivery.mockRejectedValue(new Error("delivery update failed"))
    mocked.checkoutSessionsExpire.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("stripe is down"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toThrow("delivery update failed")

    expect(console.error).toHaveBeenCalledWith("Failed to expire Checkout Session cs_new:", expect.any(Error))
  })
})
