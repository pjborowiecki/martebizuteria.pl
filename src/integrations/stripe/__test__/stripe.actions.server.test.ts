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
  getActiveDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  getStripeCustomerId: vi.fn<() => Promise<string | undefined>>(),
  releaseInventoryByVariantLines: vi.fn(),
  releaseInventoryForItems: vi.fn(),
  repointPayment: vi.fn(),
  requestLocale: { value: "pl-PL" },
  reserveInventoryByVariantLines: vi.fn(),
  reserveInventoryForItems: vi.fn(),
  resolveCheckoutDiscount: vi.fn<() => Promise<{ amountMinorUnits: number; code: string; discountId: string } | undefined>>(),
  scheduleProductCatalogInvalidation: vi.fn(),
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
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/discount.checkout.server", () => ({ resolveCheckoutDiscount: mocked.resolveCheckoutDiscount }))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getActiveDeliveryMethodByIdQuery: mocked.getActiveDeliveryMethodByIdQuery,
}))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({
  releaseInventoryByVariantLines: mocked.releaseInventoryByVariantLines,
  releaseInventoryForItems: mocked.releaseInventoryForItems,
}))
vi.mock("~/src/modules/inventory/inventory.utils", () => ({
  reserveInventoryByVariantLines: mocked.reserveInventoryByVariantLines,
  reserveInventoryForItems: mocked.reserveInventoryForItems,
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  createPendingPayment: mocked.createPendingPayment,
  getPaymentContextByTransactionId: mocked.getPaymentContextByTransactionId,
  repointPayment: mocked.repointPayment,
}))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getProductsWithInventoryByHandles: mocked.getProductsWithInventoryByHandles,
}))
vi.mock("~/src/lib/url", () => ({ resolveAssetURL: (source: string) => `https://assets.test/${source}` }))

import { createCheckoutSessionInputSchema, updateCheckoutSessionInputSchema } from "~/src/integrations/stripe/stripe.actions.schemas"
import { handleCreateCheckoutSession, handleUpdateCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  parseCheckoutSessionMetadataItems,
  readCheckoutSessionItemsJson,
  toCheckoutSessionItemsMetadata,
} from "~/src/modules/checkout/checkout-metadata.zod"

const CHECKOUT_VALUES = {
  address1: "ul. Mokotowska 12/4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "dpd-courier",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48600123456",
  postalCode: "00-640",
}

const CART_ITEM = {
  id: "line-1",
  image: "products/bracelet.jpg",
  price: "249,00 zł",
  qty: 2,
  rawPrice: 24_900,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId: "variant-1",
  variantTitle: "Rozmiar M",
}

interface Inventory {
  id: string
  quantityAvailable: number
  version: number
}

interface Variant {
  id: string
  inventory: Inventory | null
  price: number
  title: string
}

const catalogueProduct = (variants: Variant[]) => ({ handle: CART_ITEM.slug, id: "product-1", variants })

const availableVariant = (): Variant => ({
  id: CART_ITEM.variantId,
  inventory: { id: "inventory-1", quantityAvailable: 5, version: 7 },
  price: 24_900,
  title: "Rozmiar M (katalog)",
})

const createInput = (values: Record<string, unknown> = {}, items: Record<string, unknown>[] = [CART_ITEM]) =>
  createCheckoutSessionInputSchema.parse({ checkoutValues: { ...CHECKOUT_VALUES, ...values }, items })

const updateInput = (values: Record<string, unknown> = {}, items: Record<string, unknown>[] = [CART_ITEM]) =>
  updateCheckoutSessionInputSchema.parse({
    checkoutValues: { ...CHECKOUT_VALUES, ...values },
    items,
    sessionId: "cs_old",
  })

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
  mocked.releaseInventoryByVariantLines.mockResolvedValue(undefined)
  mocked.releaseInventoryForItems.mockResolvedValue(undefined)
  mocked.reserveInventoryByVariantLines.mockResolvedValue(undefined)
  mocked.reserveInventoryForItems.mockResolvedValue(undefined)
  mocked.createPendingPayment.mockResolvedValue(undefined)
  mocked.repointPayment.mockResolvedValue(undefined)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
  mocked.getProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.getActiveDeliveryMethodByIdQuery.mockResolvedValue({ id: "dpd-courier", price: 1500 })
  mocked.createCheckout.mockResolvedValue("checkout-1")
  mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_300, client_secret: "cs_secret_1", id: "cs_new" })
  mocked.checkoutSessionsExpire.mockResolvedValue({})
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ metadata: { items: JSON.stringify([{ qty: 1, variantId: "variant-old" }]) } })
  mocked.getPaymentContextByTransactionId.mockResolvedValue({ checkoutId: "checkout-1", email: "anna@example.com", userId: "user-1" })
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
  mocked.getProductsWithInventoryByHandles.mockResolvedValue(
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

const requestOn = (origin: string): Request =>
  new Request(`${origin}/_serverFn/checkout`, { headers: { origin: "https://store.test", referer: "https://store.test/cart" } })

const createdSessionMetadata = (): Record<string, string> => mocked.checkoutSessionsCreate.mock.lastCall?.[0].metadata ?? {}

describe("handleCreateCheckoutSession", () => {
  it("returns the Stripe amount, client secret and session id", async () => {
    await expect(handleCreateCheckoutSession(createInput())).resolves.toStrictEqual({
      amount: 51_300,
      clientSecret: "cs_secret_1",
      sessionId: "cs_new",
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

  it("skips the delivery lookup entirely when the checkout carries no delivery method", async () => {
    const input = createInput()

    await handleCreateCheckoutSession({ ...input, checkoutValues: { ...input.checkoutValues, deliveryMethod: "" } })

    expect(mocked.getActiveDeliveryMethodByIdQuery).not.toHaveBeenCalled()
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

  it("treats a delivery method without a price as free shipping", async () => {
    mocked.getActiveDeliveryMethodByIdQuery.mockResolvedValue(undefined)

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
      transactionId: "cs_new",
    })
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
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
    expect(mocked.releaseInventoryByVariantLines).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  })
})

describe("checkout validation failures", () => {
  it("rejects a cart line whose product is no longer in the catalogue", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })
    expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
  })

  it("rejects a product that has lost all of its variants", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })
  })

  it("rejects a cart line pointing at a variant that no longer exists", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), id: "variant-2" }])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: CHECKOUT_ERROR_CODES.VARIANT_NOT_FOUND,
    })
  })

  it("refuses a catalogue price below the Stripe minimum", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), price: 199 }])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: CHECKOUT_ERROR_CODES.INVALID_PRICE,
    })
  })

  it("refuses a variant that carries no inventory row", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), inventory: null }])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY,
    })
  })

  it("refuses a quantity larger than the available stock", async () => {
    const variant = { ...availableVariant(), inventory: { id: "inventory-1", quantityAvailable: 1, version: 7 } }
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([variant])])

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY,
    })
  })

  it("looks the catalogue up by the handles the cart carries", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.getProductsWithInventoryByHandles).toHaveBeenCalledWith([CART_ITEM.slug])
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

describe("handleUpdateCheckoutSession authorization", () => {
  it("refuses a session id that belongs to no payment", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(undefined)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    expect(mocked.checkoutSessionsRetrieve).not.toHaveBeenCalled()
  })

  it("refuses to update another signed-in customer's checkout", async () => {
    mocked.getRequestSession.mockResolvedValue({ user: { id: "user-2" } })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("refuses an anonymous request against a checkout owned by a user", async () => {
    mocked.getRequestSession.mockResolvedValue(undefined)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("does not ask for a session when the checkout has no owner", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue({
      checkoutId: "checkout-1",
      email: "guest@example.com",
      userId: undefined,
    })

    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.getRequestSession).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ customer_email: CHECKOUT_VALUES.email }))
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

describe("handleUpdateCheckoutSession", () => {
  it("uses the edited checkout email for both the new session and its payment receipt", async () => {
    const input = updateInput({ email: "updated@example.com" })

    await handleUpdateCheckoutSession(input)

    expect(mocked.checkoutSessionsCreate.mock.calls[0]?.[0]).toMatchObject({
      customer: "cus_1",
      payment_intent_data: { receipt_email: "updated@example.com" },
    })
    expect(mocked.updateCheckoutDelivery).toHaveBeenCalledWith("checkout-1", input.checkoutValues, undefined)
  })

  it("swaps the previous reservation for the new cart before creating a session", async () => {
    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.checkoutSessionsRetrieve).toHaveBeenCalledWith("cs_old")
    expect(mocked.releaseInventoryByVariantLines).toHaveBeenCalledWith([{ qty: 1, variantId: "variant-old" }])
    expect(mocked.reserveInventoryForItems).toHaveBeenCalledOnce()
  })

  it("treats a previous session without item metadata as having nothing reserved", async () => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({ metadata: null })

    await handleUpdateCheckoutSession(updateInput())

    expect(mocked.releaseInventoryByVariantLines).toHaveBeenCalledWith([])
  })

  it("persists the delivery change, repoints the payment and expires the old session", async () => {
    const result = await handleUpdateCheckoutSession(updateInput())

    expect(mocked.updateCheckoutDelivery).toHaveBeenCalledWith(
      "checkout-1",
      expect.objectContaining({ deliveryMethod: "dpd-courier" }),
      undefined,
    )
    expect(mocked.repointPayment).toHaveBeenCalledWith({ amount: 51_300, newTransactionId: "cs_new", oldTransactionId: "cs_old" })
    expect(mocked.checkoutSessionsExpire).toHaveBeenCalledWith("cs_old")
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
    expect(result).toStrictEqual({ amount: 51_300, clientSecret: "cs_secret_1", sessionId: "cs_new" })
  })

  it("keeps the updated session even when the old one cannot be expired", async () => {
    mocked.checkoutSessionsExpire.mockRejectedValue(new Error("already expired"))

    await expect(handleUpdateCheckoutSession(updateInput())).resolves.toMatchObject({ sessionId: "cs_new" })

    expect(console.error).toHaveBeenCalledWith("Failed to expire previous Checkout Session:", expect.any(Error))
    expect(mocked.scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
  })

  it("does not repoint the payment when the update is rejected by validation", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([])

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })
    expect(mocked.repointPayment).not.toHaveBeenCalled()
  })
})

describe("handleUpdateCheckoutSession compensation", () => {
  it("restores the previous reservation when the new cart fails validation", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([])])

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })

    expect(mocked.reserveInventoryByVariantLines).toHaveBeenCalledWith([{ qty: 1, variantId: "variant-old" }])
    expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
  })

  it("logs and rethrows the validation error when the restore also fails", async () => {
    mocked.getProductsWithInventoryByHandles.mockResolvedValue([])
    mocked.reserveInventoryByVariantLines.mockRejectedValue(new Error("restore failed"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
    })

    expect(console.error).toHaveBeenCalledWith(
      "Failed to restore prior inventory after checkout update validation error:",
      expect.any(Error),
    )
  })

  it("releases the new reservation and restores the old one when Stripe rejects the new session", async () => {
    const failure = new Error("stripe rejected the session")
    mocked.checkoutSessionsCreate.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)

    expect(mocked.releaseInventoryForItems).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ inventoryId: "inventory-1" })]),
    )
    expect(mocked.reserveInventoryByVariantLines).toHaveBeenLastCalledWith([{ qty: 1, variantId: "variant-old" }])
    expect(console.error).toHaveBeenCalledWith("Stripe/DB error during checkout session update:", failure)
  })

  it("compensates when repointing the payment fails after the session was created", async () => {
    const failure = new Error("payment row is gone")
    mocked.repointPayment.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)

    expect(mocked.releaseInventoryForItems).toHaveBeenCalledOnce()
    expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
    expect(mocked.scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
  })

  it("logs both compensation failures and still rethrows", async () => {
    const failure = new Error("delivery update failed")
    mocked.updateCheckoutDelivery.mockRejectedValue(failure)
    mocked.releaseInventoryForItems.mockRejectedValue(new Error("release failed"))
    mocked.reserveInventoryByVariantLines.mockRejectedValue(new Error("restore failed"))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)

    expect(console.error).toHaveBeenCalledWith("Failed to release inventory after checkout update error:", expect.any(Error))
    expect(console.error).toHaveBeenCalledWith("Failed to restore prior inventory after checkout update error:", expect.any(Error))
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
