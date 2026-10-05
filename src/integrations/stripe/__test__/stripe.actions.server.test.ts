import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate:
    vi.fn<(params: { metadata: Record<string, string>; payment_intent_data?: { setup_future_usage?: string } }) => Promise<unknown>>(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  couponsCreate: vi.fn<(params: object) => Promise<{ id: string }>>(),
  couponsDel: vi.fn((couponId: string) => Promise.resolve({ deleted: true, id: couponId })),
  couponsRetrieve: vi.fn((couponId: string) =>
    Promise.resolve({ id: couponId, metadata: { checkoutId: "checkout-1", source: "marte_checkout" } }),
  ),
  createCheckout:
    vi.fn<(input: { checkoutValues: { email: string }; discountId?: string; userEmail: string; userId?: string }) => Promise<string>>(),
  createPendingPayment: vi.fn(),
  ensureStripeCustomer: vi.fn<() => Promise<string>>(),
  getOfferedDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  getStripeCustomerId: vi.fn<() => Promise<string | undefined>>(),
  releaseCheckout: vi.fn(),
  releaseInventoryForItems: vi.fn(),
  requestLocale: { value: "pl-PL" },
  reserveInventoryByVariantLines: vi.fn(),
  reserveInventoryForItems: vi.fn(),
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
    coupons: { create: mocked.couponsCreate, del: mocked.couponsDel, retrieve: mocked.couponsRetrieve },
  },
}))
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({
  ensureStripeCustomer: mocked.ensureStripeCustomer,
  getStripeCustomerId: mocked.getStripeCustomerId,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => mocked.requestLocale.value }))
vi.mock("~/src/modules/checkout/use-cases/create-checkout.server", () => ({ createCheckout: mocked.createCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: mocked.releaseCheckout }))
vi.mock("~/src/modules/checkout/use-cases/supersede-checkout-session.server", () => ({
  supersedeCheckoutSession: mocked.supersedeCheckoutSession,
}))
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/discount.checkout.server", () => ({ resolveCheckoutDiscount: mocked.resolveCheckoutDiscount }))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getOfferedDeliveryMethodByIdQuery: mocked.getOfferedDeliveryMethodByIdQuery,
}))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ releaseInventoryForItems: mocked.releaseInventoryForItems }))
vi.mock("~/src/modules/inventory/inventory.utils", () => ({
  reserveInventoryByVariantLines: mocked.reserveInventoryByVariantLines,
  reserveInventoryForItems: mocked.reserveInventoryForItems,
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  createPendingPayment: mocked.createPendingPayment,
  getPaymentContextByTransactionId: mocked.getPaymentContextByTransactionId,
}))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getPublishedProductsWithInventoryByHandles: mocked.getPublishedProductsWithInventoryByHandles,
}))
vi.mock("~/src/lib/url", () => ({ resolveAssetURL: (source: string) => `https://assets.test/${source}` }))

import {
  CART_ITEM,
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
import {
  parseCheckoutSessionMetadataItems,
  readCheckoutSessionItemsJson,
  toCheckoutSessionItemsMetadata,
} from "~/src/modules/checkout/checkout-metadata.zod"

const STRIPE_METADATA_VALUE_LENGTH = 500

const STRIPE_METADATA_KEY_LIMIT = 50

const EXPECTED_META_ITEMS = toCheckoutSessionItemsMetadata([
  {
    handle: CART_ITEM.slug,
    imageUrl: `https://assets.test/${CART_ITEM.image}`,
    price: 24_900,
    qty: 2,
    title: "Bransoletka Aurora — Rozmiar M",
    variantId: CART_ITEM.variantId,
  },
])

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  mocked.getRequest.mockReturnValue(requestOn("http://127.0.0.1:3000"))
  signInCustomerWithStripeAccount()
  mocked.releaseCheckout.mockResolvedValue(undefined)
  mocked.releaseInventoryForItems.mockResolvedValue(undefined)
  mocked.reserveInventoryByVariantLines.mockResolvedValue(undefined)
  mocked.reserveInventoryForItems.mockResolvedValue(undefined)
  mocked.createPendingPayment.mockResolvedValue(undefined)
  mocked.supersedeCheckoutSession.mockResolvedValue(true)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1500, type: "courier" })
  mocked.createCheckout.mockResolvedValue("checkout-1")
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

const multiItemCart = (size: number) =>
  Array.from({ length: size }, (_, index) => ({
    ...CART_ITEM,
    id: `line-${String(index)}`,
    image: `products/0199a1b2-c3d4-7e5f-8901-23456789ab0${String(index)}.avif`,
    slug: `bransoletka-aurora-${String(index)}`,
    variantId: `0199a1b2-c3d4-7e5f-8901-23456789ab0${String(index)}`,
  }))

const stubCatalogueForCart = (cartItems: ReturnType<typeof multiItemCart>): void => {
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue(
    cartItems.map((item) => ({
      handle: item.slug,
      id: `product-${item.variantId}`,
      variants: [{ ...availableVariant(), id: item.variantId }],
    })),
  )
}

const signInCustomerWithStripeAccount = (): void => {
  mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1", name: "Anna Kowalska" } })
  mocked.ensureStripeCustomer.mockResolvedValue("cus_1")
  mocked.getStripeCustomerId.mockResolvedValue("cus_1")
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
          { price_data: { currency: "pln", product_data: { name: "Shipping" }, unit_amount: 1500 }, quantity: 1 },
        ],
        mode: "payment",
        ui_mode: "elements",
      }),
    )
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

  it("carries the checkout id, catalogue line snapshot, locale and user id in the session metadata", async () => {
    await handleCreateCheckoutSession(createInput())

    const metadata = {
      checkoutId: "checkout-1",
      discountCode: "",
      discountTotal: "0",
      locale: "pl-PL",
      userId: "user-1",
      ...EXPECTED_META_ITEMS,
    }

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata,
        payment_intent_data: { metadata, receipt_email: "anna@example.com" },
      }),
    )
  })

  it("records an empty user id in the metadata for a guest checkout", async () => {
    mocked.getRequestSession.mockResolvedValue(undefined)

    await handleCreateCheckoutSession(createInput())

    const metadata = { checkoutId: "checkout-1", discountCode: "", discountTotal: "0", locale: "pl-PL", userId: "", ...EXPECTED_META_ITEMS }

    const createArgs = mocked.createCheckout.mock.calls[0]?.[0]

    expect(createArgs).toMatchObject({ userEmail: "anna@example.com", userId: undefined })
    expect(createArgs?.checkoutValues).toMatchObject({ email: "anna@example.com" })
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ metadata }))
  })

  it("reserves the catalogue price, inventory version and catalogue variant title, not the values the client sent", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.reserveInventoryForItems).toHaveBeenCalledWith([
      {
        ...CART_ITEM,
        currentVersion: 7,
        inventoryId: "inventory-1",
        lineTitle: "Bransoletka Aurora — Rozmiar M",
        priceCents: 24_900,
        productId: "product-1",
        variantTitle: "Rozmiar M (katalog)",
      },
    ])
  })

  it("uses the bare product title when the client sent no variant title", async () => {
    await handleCreateCheckoutSession(createInput({}, [{ ...CART_ITEM, variantTitle: "" }]))

    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price_data: { currency: "pln", product_data: { name: "Bransoletka Aurora" }, unit_amount: 24_900 }, quantity: 2 },
          { price_data: { currency: "pln", product_data: { name: "Shipping" }, unit_amount: 1500 }, quantity: 1 },
        ],
      }),
    )
  })

  it("registers a pending payment in the store currency against the new session", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.createPendingPayment).toHaveBeenCalledWith({
      amount: 51_300,
      checkoutId: "checkout-1",
      currency: "PLN",
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
    expect(mocked.ensureStripeCustomer).not.toHaveBeenCalled()
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
    const variant = { ...availableVariant(), inventory: { id: "inventory-1", quantityAvailable: 1, version: 7 } }
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

    expect(mocked.ensureStripeCustomer).toHaveBeenCalledWith({
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

    expect(mocked.ensureStripeCustomer).not.toHaveBeenCalled()
    expect(params).toMatchObject({ customer_email: "anna@example.com" })
    expect(params).not.toHaveProperty("customer")
    expect(params).not.toHaveProperty("saved_payment_method_options")
  })

  it("keeps the card offer on the replacement session when the checkout is edited", async () => {
    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.getStripeCustomerId).toHaveBeenCalledWith("user-1")
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1", saved_payment_method_options: { payment_method_save: "enabled" } }),
    )
  })

  it("leaves an owner who never reached Stripe without a customer on the session", async () => {
    mocked.getStripeCustomerId.mockResolvedValue(undefined)

    await handleUpdateCheckoutSession(updateInput())

    const params = mocked.checkoutSessionsCreate.mock.calls[0]?.[0]

    expect(params).toMatchObject({ customer_email: "anna@example.com" })
    expect(params).not.toHaveProperty("saved_payment_method_options")
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

describe("handleCreateCheckoutSession with a cart Stripe used to reject", () => {
  it("keeps every metadata value inside Stripe's 500 character limit", async () => {
    const cartItems = multiItemCart(6)
    stubCatalogueForCart(cartItems)

    await handleCreateCheckoutSession(createInput({}, cartItems))
    const metadata = createdSessionMetadata()

    for (const [key, value] of Object.entries(metadata)) {
      expect(value.length, `${key} is ${String(value.length)} characters`).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_LENGTH)
    }
  })

  it("stays well inside Stripe's 50 key limit", async () => {
    const cartItems = multiItemCart(6)
    stubCatalogueForCart(cartItems)

    await handleCreateCheckoutSession(createInput({}, cartItems))

    expect(Object.keys(createdSessionMetadata()).length).toBeLessThan(STRIPE_METADATA_KEY_LIMIT)
  })

  it("still carries every line of the cart through the metadata", async () => {
    const cartItems = multiItemCart(6)
    stubCatalogueForCart(cartItems)

    await handleCreateCheckoutSession(createInput({}, cartItems))
    const itemsJson = readCheckoutSessionItemsJson(createdSessionMetadata())
    const lines = parseCheckoutSessionMetadataItems(itemsJson)

    expect(lines.map((line) => line.variantId)).toStrictEqual(cartItems.map((item) => item.variantId))
  })
})
