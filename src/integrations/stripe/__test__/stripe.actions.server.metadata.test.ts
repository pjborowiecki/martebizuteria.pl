import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface SessionParams {
  line_items: readonly { price_data: { product_data: { name: string } } }[]
  metadata: Record<string, string>
  payment_intent_data: Record<string, unknown> & { metadata: Record<string, string> }
}

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn<(params: SessionParams) => Promise<unknown>>(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  createCheckout: vi.fn(),
  createPendingPayment: vi.fn<(input: { lines: readonly { imageUrl?: string | undefined; variantId: string }[] }) => Promise<void>>(),
  ensureStripeCustomerWithEmail: vi.fn(),
  getHeldLinesByTransactionId: vi.fn<(transactionId: string) => Promise<readonly { qty: number; variantId: string }[]>>(),
  getOfferedDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  releaseInventoryForItems: vi.fn(),
  requestLocale: { value: "pl-PL" },
  reserveInventoryForItems: vi.fn(),
  resolveCheckoutDiscount: vi.fn(),
  supersedeCheckoutSession: vi.fn<(input: { lines: readonly { variantId: string }[] }) => Promise<boolean>>(),
  updateCheckoutDelivery: vi.fn(),
}))

vi.mock("cloudflare:workers", () => ({ env: { APP_ENV: "preview" } }))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocked.getRequest }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: mocked.getRequestSession }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: vi.fn(),
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
  ensureStripeCustomerWithEmail: mocked.ensureStripeCustomerWithEmail,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => mocked.requestLocale.value }))
vi.mock("~/src/modules/checkout/use-cases/create-checkout.server", () => ({ createCheckout: mocked.createCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: vi.fn() }))
vi.mock("~/src/modules/checkout/use-cases/supersede-checkout-session.server", () => ({
  supersedeCheckoutSession: mocked.supersedeCheckoutSession,
}))
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/discount.checkout.server", () => ({ resolveCheckoutDiscount: mocked.resolveCheckoutDiscount }))
vi.mock("~/src/modules/discount/discount.claim.server", () => ({
  claimCheckoutDiscount: vi.fn(() => Promise.resolve()),
  keepClaimedDiscount: vi.fn(),
  releaseDiscountClaims: vi.fn(),
  releaseUnappliedDiscountClaims: vi.fn(),
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
vi.mock("~/src/modules/user-email-history/user-email-history.accessors", () => ({
  resolveAccountAddress: ({ email }: { email: string }) => Promise.resolve(email),
}))
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

import { CART_LINES_MAX } from "~/src/modules/cart/cart.constants"

import enUsCheckoutMessages from "~/messages/en-US/pages.checkout.json"
import plPlCheckoutMessages from "~/messages/pl-PL/pages.checkout.json"

const BLIK_DESCRIPTION_LENGTH_MAX = 70

const PAYMENT_INTENT_METADATA_KEYS = ["checkoutId", "deployment", "discountCode", "discountTotal", "locale", "shippingTotal", "userId"]

const variantIdOf = (index: number): string => `0199a1b2-c3d4-7e5f-8901-${String(index).padStart(12, "0")}`

const shortCart = (size: number) =>
  Array.from({ length: size }, (_, index) => ({
    ...CART_ITEM,
    id: variantIdOf(index),
    image: `products/${variantIdOf(index)}.webp`,
    qty: 1,
    slug: `pierscionek-${String(index)}`,
    title: `Pierścionek ${String(index)}`,
    variantId: variantIdOf(index),
    variantTitle: "",
  }))

const longCart = (size: number) =>
  Array.from({ length: size }, (_, index) => ({
    ...CART_ITEM,
    id: variantIdOf(index),
    image: `https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/${variantIdOf(index)}-a9ce13f98e72423eb72107a4e696f2e0.webp`,
    qty: 1,
    slug: `srebrny-pierscionek-z-labradorytem-${String(index)}`,
    title: `Srebrny pierścionek z labradorytem ${String(index)}`,
    variantId: variantIdOf(index),
    variantTitle: "Rozmiar 14",
  }))

const stubCatalogueForCart = (cartItems: readonly { slug: string; variantId: string }[]): void => {
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue(
    cartItems.map((item) => ({
      ...catalogueProduct([{ ...availableVariant(), id: item.variantId }]),
      handle: item.slug,
      id: `product-${item.variantId}`,
    })),
  )
}

const createdSession = (): SessionParams | undefined => mocked.checkoutSessionsCreate.mock.lastCall?.[0]

const recordedLines = () => mocked.createPendingPayment.mock.lastCall?.[0].lines

const FORGED_CART_ITEM = {
  ...CART_ITEM,
  image: "https://attacker.test/tracking-pixel.png",
  title: "Darmowa bransoletka",
  variantTitle: "<a href='https://attacker.test'>odbierz nagrodę</a>",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  mocked.getRequest.mockReturnValue(requestOn("http://127.0.0.1:3000"))
  mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1", name: "Anna Kowalska" } })
  mocked.ensureStripeCustomerWithEmail.mockResolvedValue("cus_1")
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1500, type: "courier" })
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.resolveCheckoutDiscount.mockResolvedValue(undefined)
  mocked.reserveInventoryForItems.mockResolvedValue(undefined)
  mocked.releaseInventoryForItems.mockResolvedValue(undefined)
  mocked.createCheckout.mockResolvedValue({ checkoutId: "checkout-1", discountClaimed: false })
  mocked.createPendingPayment.mockResolvedValue(undefined)
  mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_300, client_secret: "cs_secret_1", id: "cs_new" })
  mocked.checkoutSessionsExpire.mockResolvedValue({})
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "open" })
  mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext())
  mocked.getHeldLinesByTransactionId.mockResolvedValue(HELD_LINES)
  mocked.supersedeCheckoutSession.mockResolvedValue(true)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  mocked.requestLocale.value = "pl-PL"
})

describe("the text the shopper's bank shows for the payment", () => {
  it.each([
    { description: "M'Arte – zamówienie w sklepie internetowym", locale: "pl-PL" },
    { description: "M'Arte – online shop order", locale: "en-US" },
  ])("names the shop in $locale on a new session and on the replacement for an edited checkout", async ({ description, locale }) => {
    mocked.requestLocale.value = locale

    await handleCreateCheckoutSession(createInput())
    await handleUpdateCheckoutSession(updateInput())

    for (const [params] of mocked.checkoutSessionsCreate.mock.calls) {
      expect(params.payment_intent_data).toMatchObject({ description })
    }
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledTimes(2)
  })

  it.each([enUsCheckoutMessages, plPlCheckoutMessages])("fits the 70 characters a BLIK banking app shows", (messages) => {
    expect(messages.paymentDescription.length).toBeLessThanOrEqual(BLIK_DESCRIPTION_LENGTH_MAX)
  })

  it("leaves the statement descriptor to the account, since Stripe refuses one on a session that also takes cards", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(createdSession()?.payment_intent_data).not.toHaveProperty("statement_descriptor")
    expect(createdSession()?.payment_intent_data).not.toHaveProperty("statement_descriptor_suffix")
  })
})

describe("the payment intent metadata", () => {
  it("carries the checkout's own fields, not the cart, so every charge and refund stays small", async () => {
    const cartItems = shortCart(6)
    stubCatalogueForCart(cartItems)

    await handleCreateCheckoutSession(createInput({}, cartItems))

    expect(Object.keys(createdSession()?.payment_intent_data.metadata ?? {})).toStrictEqual(PAYMENT_INTENT_METADATA_KEYS)
    expect(createdSession()?.metadata).toMatchObject(createdSession()?.payment_intent_data.metadata ?? {})
  })
})

describe("a cart of the most lines the checkout takes", () => {
  it("opens a session whose metadata names only the checkout and keeps every line on its payment", async () => {
    const cartItems = longCart(CART_LINES_MAX)
    stubCatalogueForCart(cartItems)

    await handleCreateCheckoutSession(createInput({}, cartItems))

    expect(Object.keys(createdSession()?.metadata ?? {})).toStrictEqual(PAYMENT_INTENT_METADATA_KEYS)
    expect(mocked.createPendingPayment.mock.lastCall?.[0].lines.map((line) => line.variantId)).toStrictEqual(
      cartItems.map((item) => item.variantId),
    )
  })

  it("is edited into a replacement session that hands every line to the payment it supersedes", async () => {
    const cartItems = longCart(CART_LINES_MAX)
    stubCatalogueForCart(cartItems)

    await handleUpdateCheckoutSession(updateInput({}, cartItems))

    expect(Object.keys(createdSession()?.metadata ?? {})).toStrictEqual(PAYMENT_INTENT_METADATA_KEYS)
    expect(mocked.supersedeCheckoutSession.mock.lastCall?.[0].lines.map((line) => line.variantId)).toStrictEqual(
      cartItems.map((item) => item.variantId),
    )
  })
})

describe("the lines a payment, its order and its e-mails record", () => {
  it("names and pictures each line from the catalogue, whatever title and image the browser sends", async () => {
    const catalogueLine = {
      handle: CART_ITEM.slug,
      imageUrl: `https://assets.test/${CATALOGUE_IMAGE}`,
      price: 24_900,
      qty: 2,
      title: "Bransoletka Aurora — Rozmiar M",
      variantId: CART_ITEM.variantId,
    }

    await handleCreateCheckoutSession(createInput({}, [FORGED_CART_ITEM]))
    await handleUpdateCheckoutSession(updateInput({}, [FORGED_CART_ITEM]))

    expect(recordedLines()).toStrictEqual([catalogueLine])
    expect(mocked.supersedeCheckoutSession.mock.lastCall?.[0].lines).toStrictEqual([catalogueLine])
    expect(mocked.checkoutSessionsCreate.mock.calls.map(([params]) => params.line_items[0]?.price_data.product_data.name)).toStrictEqual([
      catalogueLine.title,
      catalogueLine.title,
    ])
  })

  it("names the line in the language the shopper checks out in", async () => {
    mocked.requestLocale.value = "en-US"

    await handleCreateCheckoutSession(createInput())

    expect(recordedLines()).toMatchObject([{ title: "Aurora bracelet — Rozmiar M" }])
  })

  it("names a product sold without options by its title alone", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([{ ...availableVariant(), title: "Default" }])])

    await handleCreateCheckoutSession(createInput())

    expect(recordedLines()).toMatchObject([{ title: "Bransoletka Aurora" }])
  })

  it("shows the picture of the variant bought rather than the product's own", async () => {
    const images = [
      { url: CATALOGUE_IMAGE, variantId: null },
      { url: "products/aurora-other.jpg", variantId: "variant-2" },
      { url: "products/aurora-m.jpg", variantId: CART_ITEM.variantId },
    ]
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()], { images })])

    await handleCreateCheckoutSession(createInput())

    expect(recordedLines()).toMatchObject([{ imageUrl: "https://assets.test/products/aurora-m.jpg" }])
  })

  it("falls back to the product's thumbnail when neither the variant nor the product has a picture of its own", async () => {
    const images = [{ url: "products/aurora-other.jpg", variantId: "variant-2" }]
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([
      catalogueProduct([availableVariant()], { images, thumbnail: "products/aurora-other.jpg" }),
    ])

    await handleCreateCheckoutSession(createInput())

    expect(recordedLines()).toMatchObject([{ imageUrl: "https://assets.test/products/aurora-other.jpg" }])
  })

  it("records no picture for a product the shop has no picture of", async () => {
    mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([
      catalogueProduct([availableVariant()], { images: [], thumbnail: null }),
    ])

    await handleCreateCheckoutSession(createInput({}, [FORGED_CART_ITEM]))

    expect(recordedLines()).toHaveLength(1)
    expect(recordedLines()?.[0]?.imageUrl).toBeUndefined()
  })
})
