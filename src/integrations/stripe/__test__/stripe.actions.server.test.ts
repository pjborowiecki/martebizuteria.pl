import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface AppliedDiscount {
  amountMinorUnits: number
  code: string
  discountId: string
}

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate:
    vi.fn<(params: { metadata: Record<string, string>; payment_intent_data?: { setup_future_usage?: string } }) => Promise<unknown>>(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  claimCheckoutDiscount: vi.fn(({ applied }: { applied: AppliedDiscount | undefined }) => Promise.resolve(applied)),
  couponsCreate: vi.fn<(params: object) => Promise<{ id: string }>>(),
  couponsDel: vi.fn((couponId: string) => Promise.resolve({ deleted: true, id: couponId })),
  couponsRetrieve: vi.fn((couponId: string) =>
    Promise.resolve({ id: couponId, metadata: { checkoutId: "checkout-1", source: "marte_checkout" } }),
  ),
  createCheckout:
    vi.fn<
      (input: {
        checkoutValues: { email: string }
        discountId?: string
        userEmail: string
        userId?: string
      }) => Promise<{ checkoutId: string; discountClaimed: boolean }>
    >(),
  createPendingPayment: vi.fn(),
  ensureStripeCustomerWithEmail: vi.fn<() => Promise<string>>(),
  forgetCheckoutClientAddress: vi.fn((_checkoutId: string) => Promise.resolve()),
  getHeldLinesByTransactionId: vi.fn(),
  getOfferedDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  releaseCheckout: vi.fn(),
  releaseDiscountClaims: vi.fn((_checkoutId: string) => Promise.resolve()),
  releaseInventoryForItems: vi.fn(),
  releaseUnappliedDiscountClaims: vi.fn((_checkoutId: string) => Promise.resolve()),
  requestLocale: { value: "pl-PL" },
  reserveInventoryForItems: vi.fn(),
  resolveAccountAddress: vi.fn(({ email }: { email: string; userId: string }) => Promise.resolve(email)),
  resolveCheckoutDiscount: vi.fn<() => Promise<{ amountMinorUnits: number; code: string; discountId: string } | undefined>>(),
  scheduleProductCatalogInvalidation: vi.fn(),
  supersedeCheckoutSession: vi.fn(),
  updateCheckoutDelivery: vi.fn(),
}))

vi.mock("cloudflare:workers", () => ({ env: { APP_ENV: "preview" } }))
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
    coupons: { create: mocked.couponsCreate, del: mocked.couponsDel, retrieve: mocked.couponsRetrieve },
  },
}))
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({
  ensureStripeCustomerWithEmail: mocked.ensureStripeCustomerWithEmail,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => mocked.requestLocale.value }))
vi.mock("~/src/modules/checkout/use-cases/create-checkout.server", () => ({ createCheckout: mocked.createCheckout }))
vi.mock("~/src/modules/checkout/use-cases/forget-checkout-client-address.server", () => ({
  forgetCheckoutClientAddress: mocked.forgetCheckoutClientAddress,
}))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: mocked.releaseCheckout }))
vi.mock("~/src/modules/checkout/use-cases/supersede-checkout-session.server", () => ({
  supersedeCheckoutSession: mocked.supersedeCheckoutSession,
}))
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/use-cases/resolve-checkout-discount.server", () => ({
  resolveCheckoutDiscount: mocked.resolveCheckoutDiscount,
}))
vi.mock("~/src/modules/discount/use-cases/claim-checkout-discount.server", () => ({
  claimCheckoutDiscount: mocked.claimCheckoutDiscount,
  keepClaimedDiscount: (applied: AppliedDiscount | undefined, claimed: boolean) => (claimed ? applied : undefined),
  releaseDiscountClaims: mocked.releaseDiscountClaims,
  releaseUnappliedDiscountClaims: mocked.releaseUnappliedDiscountClaims,
}))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getOfferedDeliveryMethodByIdQuery: mocked.getOfferedDeliveryMethodByIdQuery,
}))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ releaseInventoryForItems: mocked.releaseInventoryForItems }))
vi.mock("~/src/modules/inventory/use-cases/reserve-inventory.server", () => ({
  reserveInventoryForItems: mocked.reserveInventoryForItems,
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  createPendingPayment: mocked.createPendingPayment,
  getHeldLinesByTransactionId: mocked.getHeldLinesByTransactionId,
  getPaymentContextByTransactionId: mocked.getPaymentContextByTransactionId,
}))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getPublishedProductsWithInventoryByHandles: mocked.getPublishedProductsWithInventoryByHandles,
}))
vi.mock("~/src/modules/store-setting/store-setting.accessors", () => ({ isSalesPaused: () => Promise.resolve(false) }))
vi.mock("~/src/modules/checkout/use-cases/count-open-checkouts.server", () => ({
  countOpenCheckouts: () => Promise.resolve({ byClientAddress: 0, byEmail: 0 }),
}))
vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: () => "203.0.113.7" }))
vi.mock("~/src/modules/user-email-history/user-email-history.accessors", () => ({ resolveAccountAddress: mocked.resolveAccountAddress }))
vi.mock("~/src/lib/url", () => ({ resolveAssetURL: (source: string) => `https://assets.test/${source}` }))

import {
  CART_ITEM,
  CATALOGUE_IMAGE,
  HELD_LINES,
  availableVariant,
  catalogueProduct,
  createInput,
  pendingContext,
  requestOn,
  updateInput,
} from "~/src/integrations/stripe/__test__/fixtures/checkout-session-inputs"
import { handleCreateCheckoutSession, handleUpdateCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const EXPECTED_LINES = [
  {
    handle: CART_ITEM.slug,
    imageUrl: `https://assets.test/${CATALOGUE_IMAGE}`,
    price: 24_900,
    qty: 2,
    title: "Bransoletka Aurora — Rozmiar M",
    variantId: CART_ITEM.variantId,
  },
]

beforeEach(() => {
  mocked.getHeldLinesByTransactionId.mockResolvedValue(HELD_LINES)
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  mocked.getRequest.mockReturnValue(requestOn("http://127.0.0.1:3000"))
  signInCustomerWithStripeAccount()
  mocked.releaseCheckout.mockResolvedValue(undefined)
  mocked.releaseInventoryForItems.mockResolvedValue(undefined)
  mocked.reserveInventoryForItems.mockResolvedValue(undefined)
  mocked.createPendingPayment.mockResolvedValue(undefined)
  mocked.supersedeCheckoutSession.mockResolvedValue(true)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1500, type: "courier" })
  mocked.createCheckout.mockResolvedValue({ checkoutId: "checkout-1", discountClaimed: true })
  mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_300, client_secret: "cs_secret_1", id: "cs_new" })
  mocked.checkoutSessionsExpire.mockResolvedValue({})
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ metadata: { items: JSON.stringify(HELD_LINES) }, status: "open" })
  mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext())
  mocked.resolveCheckoutDiscount.mockResolvedValue(undefined)
  mocked.couponsCreate.mockResolvedValue({ id: "coupon_1" })
})

afterEach(() => {
  vi.restoreAllMocks()
  mocked.requestLocale.value = "pl-PL"
})

const signInCustomerWithStripeAccount = (): void => {
  mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1", name: "Anna Kowalska" } })
  mocked.ensureStripeCustomerWithEmail.mockResolvedValue("cus_1")
}

const createdSessionMetadata = (): Record<string, string> => mocked.checkoutSessionsCreate.mock.lastCall?.[0].metadata ?? {}

describe("handleCreateCheckoutSession quote", () => {
  it("quotes the catalogue price, not the one the browser remembers", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), price: 26_900 }])])
    mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 55_300, client_secret: "cs_secret_1", id: "cs_new" })

    const result = await handleCreateCheckoutSession(createInput({}, [{ ...CART_ITEM, price: "199,00 zł", rawPrice: 19_900 }]))

    expect(result.lines).toStrictEqual([{ qty: 2, unitPrice: 26_900, variantId: "variant-1" }])
    expect(result.totals).toMatchObject({ subtotal: 53_800, total: 55_300 })
  })

  it("quotes the discount the session carries, so the total shown is the one Stripe takes", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 49_300, client_secret: "cs_secret_1", id: "cs_new" })

    const result = await handleCreateCheckoutSession(createInput({ discountCode: "SPRING" }))

    expect(result.totals).toStrictEqual({
      discountTotal: 2000,
      shippingTotal: 1500,
      subtotal: 49_800,
      taxTotal: 9219,
      total: 49_300,
      vatBasisPoints: 2300,
    })
    expect(result.totals.total).toBe(result.amount)
  })
})

describe("handleCreateCheckoutSession free delivery", () => {
  it("delivers for free once the products reach the shop's threshold and records the free delivery on the payment", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ freeDeliveryThreshold: 40_000, price: 1500, type: "courier" })
    mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 49_800, client_secret: "cs_secret_1", id: "cs_new" })

    const result = await handleCreateCheckoutSession(createInput())

    expect(result.totals).toMatchObject({ shippingTotal: 0, subtotal: 49_800, total: 49_800 })
    expect(createdSessionMetadata()).toMatchObject({ shippingTotal: "0" })
  })

  it("charges delivery when a discount code takes the products under the threshold", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ freeDeliveryThreshold: 49_000, price: 1500, type: "courier" })
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 49_300, client_secret: "cs_secret_1", id: "cs_new" })

    const result = await handleCreateCheckoutSession(createInput({ discountCode: "SPRING" }))

    expect(result.totals).toMatchObject({ discountTotal: 2000, shippingTotal: 1500, total: 49_300 })
    expect(createdSessionMetadata()).toMatchObject({ shippingTotal: "1500" })
  })
})

describe("handleCreateCheckoutSession", () => {
  it("returns the Stripe session with the catalogue prices and totals it charges", async () => {
    await expect(handleCreateCheckoutSession(createInput())).resolves.toStrictEqual({
      amount: 51_300,
      clientSecret: "cs_secret_1",
      lines: [{ qty: 2, unitPrice: 24_900, variantId: "variant-1" }],
      sessionId: "cs_new",
      totals: { discountTotal: 0, shippingTotal: 1500, subtotal: 49_800, taxTotal: 9593, total: 51_300, vatBasisPoints: 2300 },
    })
  })

  it("prices the line from the catalogue and appends the delivery cost as its own line", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        line_items: [
          {
            price_data: { currency: "pln", product_data: { name: "Bransoletka Aurora — Rozmiar M" }, unit_amount: 24_900 },
            quantity: 2,
          },
          { price_data: { currency: "pln", product_data: { name: "Dostawa kurierem" }, unit_amount: 1500 }, quantity: 1 },
        ],
        mode: "payment",
        ui_mode: "elements",
      }),
    )
  })

  it("lets the payment step hand Stripe the phone number, since the payment form collects no billing details itself", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ phone_number_collection: { enabled: true } }))
  })

  it("adds no shipping line for a free delivery method", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 0, type: "in_store" })

    await handleCreateCheckoutSession(createInput())

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          {
            price_data: { currency: "pln", product_data: { name: "Bransoletka Aurora — Rozmiar M" }, unit_amount: 24_900 },
            quantity: 2,
          },
        ],
      }),
    )
  })

  it("carries the checkout id, catalogue line snapshot, locale, user id and deployment in the session metadata", async () => {
    await handleCreateCheckoutSession(createInput())

    const metadata = {
      checkoutId: "checkout-1",
      deployment: "martebizuteria-preview",
      discountCode: "",
      discountTotal: "0",
      locale: "pl-PL",
      shippingTotal: "1500",
      userId: "user-1",
    }

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata,
        payment_intent_data: {
          description: "M'Arte – zamówienie w sklepie internetowym",
          metadata,
          receipt_email: "anna@example.com",
        },
      }),
    )
  })

  it("records an empty user id in the metadata for a guest checkout", async () => {
    mocked.getRequestSession.mockResolvedValue(undefined)

    await handleCreateCheckoutSession(createInput())

    const metadata = {
      checkoutId: "checkout-1",
      deployment: "martebizuteria-preview",
      discountCode: "",
      discountTotal: "0",
      locale: "pl-PL",
      shippingTotal: "1500",
      userId: "",
    }

    const createArgs = mocked.createCheckout.mock.calls[0]?.[0]

    expect(createArgs).toMatchObject({ userEmail: "anna@example.com", userId: undefined })
    expect(createArgs?.checkoutValues).toMatchObject({ email: "anna@example.com" })
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ metadata }))
  })

  it("uses the account's current address when a signed-in shopper checks out with an address the account has replaced", async () => {
    mocked.resolveAccountAddress.mockResolvedValueOnce("anna@new.example")

    await handleCreateCheckoutSession(createInput())

    expect(mocked.resolveAccountAddress).toHaveBeenCalledExactlyOnceWith({ email: "anna@example.com", userId: "user-1" })
    expect(mocked.createCheckout.mock.calls[0]?.[0]).toMatchObject({ userEmail: "anna@new.example", userId: "user-1" })
    expect(mocked.ensureStripeCustomerWithEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "anna@new.example" }))
  })

  it("keeps a guest's address as typed", async () => {
    mocked.getRequestSession.mockResolvedValue(undefined)

    await handleCreateCheckoutSession(createInput())

    expect(mocked.resolveAccountAddress).not.toHaveBeenCalled()
  })

  it("reserves the catalogue price, stock row and line title, not the values the client sent", async () => {
    await handleCreateCheckoutSession(createInput({}, [{ ...CART_ITEM, price: "1,00 zł", title: "Darmowa bransoletka" }]))

    expect(mocked.reserveInventoryForItems).toHaveBeenCalledWith([
      {
        handle: CART_ITEM.slug,
        imageUrl: `https://assets.test/${CATALOGUE_IMAGE}`,
        inventoryId: "inventory-1",
        priceCents: 24_900,
        qty: 2,
        title: "Bransoletka Aurora — Rozmiar M",
        variantId: "variant-1",
      },
    ])
  })

  it("registers a pending payment in the store currency against the new session", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.createPendingPayment).toHaveBeenCalledWith({
      amount: 51_300,
      checkoutId: "checkout-1",
      currency: "PLN",
      lines: EXPECTED_LINES,
      provider: "stripe",
      reservedLines: [{ qty: 2, variantId: "variant-1" }],
      transactionId: "cs_new",
    })
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
  })
})

describe("checkout session hold", () => {
  const OPENED_AT = Date.UTC(2026, 9, 5, 12, 0, 0, 900)

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(OPENED_AT)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("asks Stripe to expire a new session 32 minutes after it opens instead of after its 24-hour default", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ expires_at: 1_791_201_600 + 1920 }))
  })

  it("gives the replacement session for an edited checkout the same hold", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ checkoutCreatedAt: new Date(OPENED_AT) }))

    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ expires_at: 1_791_201_600 + 1920 }))
  })
})

describe("checkout session return URL", () => {
  it.each([
    { expected: "http://127.0.0.1:3000/checkout", locale: "pl-PL", origin: "http://127.0.0.1:3000" },
    { expected: "http://localhost:3000/en-US/checkout", locale: "en-US", origin: "http://localhost:3000" },
  ])("returns to $expected, on the address the checkout came in on, whatever the headers claim", async ({ expected, locale, origin }) => {
    mocked.requestLocale.value = locale
    mocked.getRequest.mockReturnValue(requestOn(origin))

    await handleCreateCheckoutSession(createInput())
    await handleUpdateCheckoutSession(updateInput())

    for (const [params] of mocked.checkoutSessionsCreate.mock.calls) {
      expect(params).toMatchObject({ return_url: `${expected}?success=true&session_id={CHECKOUT_SESSION_ID}` })
    }
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledTimes(2)
  })

  it("refuses a checkout on a host this build does not serve before touching Stripe or stock", async () => {
    mocked.getRequest.mockReturnValue(requestOn("https://store.test"))

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(mocked.ensureStripeCustomerWithEmail).not.toHaveBeenCalled()
    expect(mocked.getPaymentContextByTransactionId).not.toHaveBeenCalled()
    expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
    expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  })
})

describe("checkout validation failures", () => {
  it("rejects a cart line whose product was deleted, archived or returned to draft", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })
    expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
  })

  it("rejects a product that has lost all of its variants", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })
  })

  it("rejects a cart line pointing at a variant that no longer exists", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), id: "variant-2" }])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: CHECKOUT_ERROR_CODES.VARIANT_NOT_FOUND,
    })
  })

  it("refuses a catalogue price below the Stripe minimum", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), price: 199 }])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: CHECKOUT_ERROR_CODES.INVALID_PRICE,
    })
  })

  it("refuses a variant that carries no inventory row", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), inventory: null }])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY,
    })
  })

  it("refuses a quantity larger than the available stock", async () => {
    const variant = { ...availableVariant(), inventory: { id: "inventory-1", quantityAvailable: 1 } }
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([variant])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY,
    })
  })

  it("looks the catalogue up by the handles the cart carries", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.getPublishedProductsWithInventoryByHandles).toHaveBeenCalledWith([CART_ITEM.slug])
  })
})

describe("checkout session creation failures", () => {
  it("releases the reserved inventory and rethrows when the checkout row cannot be written", async () => {
    const failure = new Error("d1 write failed")
    mocked.createCheckout.mockRejectedValue(failure)

    await expect(handleCreateCheckoutSession(createInput())).rejects.toBe(failure)

    expect(mocked.releaseInventoryForItems).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ inventoryId: "inventory-1" })]),
    )
    expect(mocked.createPendingPayment).not.toHaveBeenCalled()
    expect(mocked.scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
  })

  it("rejects a Stripe session that came back without a client secret", async () => {
    mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_300, client_secret: null, id: "cs_new" })

    await expect(handleCreateCheckoutSession(createInput())).rejects.toThrow("Failed to create Checkout Session: client_secret is missing")
    expect(mocked.releaseInventoryForItems).toHaveBeenCalledOnce()
  })

  it("treats a session without an amount as zero rather than failing", async () => {
    mocked.checkoutSessionsCreate.mockResolvedValue({ client_secret: "cs_secret_1", id: "cs_new" })

    await expect(handleCreateCheckoutSession(createInput())).resolves.toMatchObject({ amount: 0 })
    expect(mocked.createPendingPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }))
  })

  it("still rethrows the original error when releasing the inventory also fails", async () => {
    const failure = new Error("stripe is down")
    mocked.checkoutSessionsCreate.mockRejectedValue(failure)
    mocked.releaseInventoryForItems.mockRejectedValue(new Error("release failed"))

    await expect(handleCreateCheckoutSession(createInput())).rejects.toBe(failure)

    expect(console.error).toHaveBeenCalledWith("Failed to release inventory after checkout error:", expect.any(Error))
  })
})

describe("checkout session saved cards", () => {
  it("attaches the signed-in customer and lets them choose to save the card", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.ensureStripeCustomerWithEmail).toHaveBeenCalledWith({
      email: "anna@example.com",
      name: "Anna Kowalska",
      userId: "user-1",
    })
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        saved_payment_method_options: { payment_method_save: "enabled" },
      }),
    )
  })

  it("never saves a card without the buyer asking for it", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0].payment_intent_data).not.toHaveProperty("setup_future_usage")
  })

  it("offers a guest no card storage, and creates no customer for them", async () => {
    mocked.getRequestSession.mockResolvedValue(undefined)

    await handleCreateCheckoutSession(createInput())

    const params = mocked.checkoutSessionsCreate.mock.calls[0]?.[0]

    expect(mocked.ensureStripeCustomerWithEmail).not.toHaveBeenCalled()
    expect(params).toMatchObject({ customer_email: "anna@example.com" })
    expect(params).not.toHaveProperty("customer")
    expect(params).not.toHaveProperty("saved_payment_method_options")
  })

  it("keeps the card offer on the replacement session when the checkout is edited", async () => {
    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.ensureStripeCustomerWithEmail).toHaveBeenCalledExactlyOnceWith({
      email: "anna@example.com",
      name: "Anna Kowalska",
      userId: "user-1",
    })
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1", saved_payment_method_options: { payment_method_save: "enabled" } }),
    )
  })

  it("gives the account's Stripe customer the email typed at checkout rather than the account's own", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { email: "anna.konto@example.com", id: "user-1", name: "Anna Kowalska" } })

    await handleCreateCheckoutSession(createInput({ email: "anna.zamowienie@example.com" }))

    expect(mocked.ensureStripeCustomerWithEmail).toHaveBeenCalledExactlyOnceWith({
      email: "anna.zamowienie@example.com",
      name: "Anna Kowalska",
      userId: "user-1",
    })
    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0]).toMatchObject({
      customer: "cus_1",
      payment_intent_data: { receipt_email: "anna.zamowienie@example.com" },
    })
    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0]).not.toHaveProperty("customer_email")
  })
})

describe("checkout session client address", () => {
  it("keeps the visitor's address on a checkout whose payment opened, for the open-checkout limit", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.forgetCheckoutClientAddress).not.toHaveBeenCalled()
  })

  it("still reports the session failure when forgetting the visitor's address fails", async () => {
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("stripe down"))
    mocked.forgetCheckoutClientAddress.mockRejectedValueOnce(new Error("d1 down"))

    await expect(handleCreateCheckoutSession(createInput())).rejects.toThrow("stripe down")
    expect(console.error).toHaveBeenCalledWith("Failed to clear the client address after checkout error:", expect.any(Error))
  })
})

describe("checkout session discounts", () => {
  it("expresses an applied discount as a one-shot Stripe coupon tagged with its checkout", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })

    await handleCreateCheckoutSession(createInput())

    expect(mocked.couponsCreate).toHaveBeenCalledWith({
      amount_off: 2000,
      currency: "pln",
      duration: "once",
      metadata: { checkoutId: "checkout-1", source: "marte_checkout" },
      name: "SPRING",
    })
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ discounts: [{ coupon: "coupon_1" }] }))
    expect(mocked.couponsDel).not.toHaveBeenCalled()
  })

  it("stores the applied code against the checkout so fulfilment can spend it", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })

    await handleCreateCheckoutSession(createInput())

    expect(mocked.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ discountId: "disc-1" }))
  })

  it("opens the session at full price when another checkout holds the code's last use", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.createCheckout.mockResolvedValue({ checkoutId: "checkout-1", discountClaimed: false })

    const result = await handleCreateCheckoutSession(createInput({ discountCode: "SPRING" }))

    expect(mocked.couponsCreate).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0]).not.toHaveProperty("discounts")
    expect(createdSessionMetadata()).toMatchObject({ discountCode: "", discountTotal: "0" })
    expect(result.totals.discountTotal).toBe(0)
  })

  it.each([
    { failure: "Stripe refuses the session", stub: () => mocked.checkoutSessionsCreate.mockRejectedValue(new Error("stripe down")) },
    { failure: "its payment cannot be recorded", stub: () => mocked.createPendingPayment.mockRejectedValue(new Error("d1 down")) },
  ])("gives back the claimed use and the stock and forgets the visitor's address when $failure", async ({ stub }) => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    stub()

    await expect(handleCreateCheckoutSession(createInput())).rejects.toThrow(/down/u)
    expect(mocked.releaseDiscountClaims).toHaveBeenCalledExactlyOnceWith("checkout-1")
    expect(mocked.forgetCheckoutClientAddress).toHaveBeenCalledExactlyOnceWith("checkout-1")
    expect(mocked.releaseInventoryForItems).toHaveBeenCalledOnce()
  })

  it("has no use to give back when a checkout without a code fails, but still forgets the visitor's address", async () => {
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("stripe down"))

    await expect(handleCreateCheckoutSession(createInput())).rejects.toThrow("stripe down")
    expect(mocked.releaseDiscountClaims).not.toHaveBeenCalled()
    expect(mocked.forgetCheckoutClientAddress).toHaveBeenCalledExactlyOnceWith("checkout-1")
  })

  it("still reports the session failure when giving back the use fails", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("stripe down"))
    mocked.releaseDiscountClaims.mockRejectedValueOnce(new Error("d1 down"))

    await expect(handleCreateCheckoutSession(createInput())).rejects.toThrow("stripe down")
    expect(console.error).toHaveBeenCalledWith("Failed to release the discount claim after checkout error:", expect.any(Error))
  })

  it("claims the code for the checkout it updates before Stripe creates the replacement", async () => {
    const applied = { amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" }
    mocked.resolveCheckoutDiscount.mockResolvedValue(applied)

    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.claimCheckoutDiscount).toHaveBeenCalledExactlyOnceWith({
      applied,
      checkoutId: "checkout-1",
      email: "anna@example.com",
      userId: "user-1",
    })
    expect(mocked.claimCheckoutDiscount).toHaveBeenCalledBefore(mocked.checkoutSessionsCreate)
    expect(mocked.supersedeCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ discountId: "disc-1" }))
  })

  it("replaces the session at full price when the code's last use is held elsewhere", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.claimCheckoutDiscount.mockResolvedValueOnce(undefined)

    const result = await handleUpdateCheckoutSession(updateInput())

    expect(mocked.couponsCreate).not.toHaveBeenCalled()
    expect(mocked.supersedeCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ discountId: undefined }))
    expect(mocked.updateCheckoutDelivery).toHaveBeenCalledWith("checkout-1", expect.any(Object), {
      discountId: undefined,
      lockerUnconfirmed: false,
    })
    expect(result.totals.discountTotal).toBe(0)
  })

  it.each([
    { failure: "Stripe refuses the replacement", stub: () => mocked.checkoutSessionsCreate.mockRejectedValue(new Error("refused")) },
    { failure: "the old session cannot be retired", stub: () => mocked.supersedeCheckoutSession.mockRejectedValue(new Error("refused")) },
  ])("gives back the use claimed for the replacement when $failure", async ({ stub }) => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    stub()

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toThrow("refused")
    expect(mocked.releaseUnappliedDiscountClaims).toHaveBeenCalledExactlyOnceWith("checkout-1")
  })

  it("has no use to give back when an update without a code fails", async () => {
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("refused"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toThrow("refused")
    expect(mocked.releaseUnappliedDiscountClaims).not.toHaveBeenCalled()
  })

  it("still reports the update failure when giving back the use fails", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("refused"))
    mocked.releaseUnappliedDiscountClaims.mockRejectedValueOnce(new Error("d1 down"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toThrow("refused")
    expect(console.error).toHaveBeenCalledWith("Failed to release the discount claim after checkout update error:", expect.any(Error))
  })

  it("creates no coupon and attaches no discount when no code applies", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.couponsCreate).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0]).not.toHaveProperty("discounts")
  })

  it("deletes the coupon it just made when Stripe refuses the session", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("The Checkout Session's total amount due must add up to at least zł2.00"))

    await expect(handleCreateCheckoutSession(createInput())).rejects.toThrow("at least zł2.00")
    expect(mocked.couponsDel).toHaveBeenCalledExactlyOnceWith("coupon_1")
  })

  it("deletes the coupon made for a replacement session that Stripe refuses", async () => {
    mocked.resolveCheckoutDiscount.mockResolvedValue({ amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1" })
    mocked.checkoutSessionsCreate.mockRejectedValue(new Error("Stripe is unavailable"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toThrow("Stripe is unavailable")
    expect(mocked.couponsDel).toHaveBeenCalledExactlyOnceWith("coupon_1")
    expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
  })
})
