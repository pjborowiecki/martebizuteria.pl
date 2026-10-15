import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface SessionParams {
  metadata: Record<string, string>
  payment_intent_data: Record<string, unknown> & { metadata: Record<string, string> }
}

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn<(params: SessionParams) => Promise<unknown>>(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  createCheckout: vi.fn(),
  createPendingPayment: vi.fn(),
  ensureStripeCustomerWithEmail: vi.fn(),
  getOfferedDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  releaseInventoryForItems: vi.fn(),
  requestLocale: { value: "pl-PL" },
  reserveInventoryForItems: vi.fn(),
  resolveCheckoutDiscount: vi.fn(),
  supersedeCheckoutSession: vi.fn(),
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
vi.mock("~/src/modules/inventory/inventory.utils", () => ({
  reserveInventoryForItems: mocked.reserveInventoryForItems,
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  createPendingPayment: mocked.createPendingPayment,
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
import { STRIPE_METADATA_KEYS_MAX, STRIPE_METADATA_VALUE_LENGTH_MAX } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CART_LINES_MAX } from "~/src/modules/cart/cart.constants"
import { parseCheckoutSessionMetadataItems, readCheckoutSessionItemsJson } from "~/src/modules/checkout/checkout-metadata.zod"

import enUsCheckoutMessages from "~/messages/en-US/pages.checkout.json"
import plPlCheckoutMessages from "~/messages/pl-PL/pages.checkout.json"

const STRIPE_METADATA_KEY_LENGTH_MAX = 40

const BLIK_DESCRIPTION_LENGTH_MAX = 70

const PAYMENT_INTENT_METADATA_KEYS = ["checkoutId", "deployment", "discountCode", "discountTotal", "locale", "userId"]

const CART_TOO_LARGE = { code: ERROR_CODES.VALIDATION, message: CHECKOUT_ERROR_CODES.CART_TOO_LARGE }

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
      handle: item.slug,
      id: `product-${item.variantId}`,
      variants: [{ ...availableVariant(), id: item.variantId }],
    })),
  )
}

const createdSession = (): SessionParams | undefined => mocked.checkoutSessionsCreate.mock.lastCall?.[0]

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
  it("opens a session whose every metadata key and value Stripe accepts, carrying every line", async () => {
    const cartItems = shortCart(CART_LINES_MAX)
    stubCatalogueForCart(cartItems)

    await handleCreateCheckoutSession(createInput({}, cartItems))
    const metadata = createdSession()?.metadata ?? {}

    expect(Object.keys(metadata).length).toBeLessThanOrEqual(STRIPE_METADATA_KEYS_MAX)
    for (const [key, value] of Object.entries(metadata)) {
      expect(key.length, key).toBeLessThanOrEqual(STRIPE_METADATA_KEY_LENGTH_MAX)
      expect(value.length, `${key} is ${String(value.length)} characters`).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_LENGTH_MAX)
    }
    expect(parseCheckoutSessionMetadataItems(readCheckoutSessionItemsJson(metadata)).map((line) => line.variantId)).toStrictEqual(
      cartItems.map((item) => item.variantId),
    )
  })

  it("is refused before any stock is held when its lines no longer fit Stripe's metadata", async () => {
    const cartItems = longCart(CART_LINES_MAX)
    stubCatalogueForCart(cartItems)

    await expect(handleCreateCheckoutSession(createInput({}, cartItems))).rejects.toMatchObject(CART_TOO_LARGE)

    expect(mocked.resolveCheckoutDiscount).not.toHaveBeenCalled()
    expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
    expect(mocked.createCheckout).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  })

  it("is refused as an edit, leaving the open session, its stock and its delivery as they were", async () => {
    const cartItems = longCart(CART_LINES_MAX)
    stubCatalogueForCart(cartItems)

    await expect(handleUpdateCheckoutSession(updateInput({}, cartItems))).rejects.toMatchObject(CART_TOO_LARGE)

    expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
    expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
    expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
  })
})
