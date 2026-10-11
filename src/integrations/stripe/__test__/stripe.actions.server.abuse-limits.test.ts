import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  clientAddress: vi.fn<(headers: Headers) => string>(),
  countOpenCheckouts: vi.fn<(owner: { clientAddress: string; email: string }) => Promise<{ byClientAddress: number; byEmail: number }>>(),
  createCheckout: vi.fn<(input: { clientAddress: string }) => Promise<{ checkoutId: string; discountClaimed: boolean }>>(),
  ensureStripeCustomer: vi.fn(),
  fetchPointByName: vi.fn<(name: string) => Promise<{ name: string } | undefined>>(),
  getOfferedDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  releaseCheckout: vi.fn(),
  reserveInventoryByVariantLines: vi.fn(),
  reserveInventoryForItems: vi.fn(),
  supersedeCheckoutSession: vi.fn(),
  updateCheckoutDelivery: vi.fn(),
  verifyTurnstileToken:
    vi.fn<(check: { action: string; hostname: string; remoteIp: string | undefined; token: string }) => Promise<void>>(),
}))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocked.getRequest }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: mocked.getRequestSession }))
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.server", () => ({ verifyTurnstileToken: mocked.verifyTurnstileToken }))
vi.mock("~/src/integrations/inpost/inpost.api", () => ({ fetchPointByName: mocked.fetchPointByName }))
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
  ensureStripeCustomer: mocked.ensureStripeCustomer,
  getStripeCustomerId: vi.fn(),
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/modules/checkout/use-cases/count-open-checkouts.server", () => ({ countOpenCheckouts: mocked.countOpenCheckouts }))
vi.mock("~/src/modules/checkout/use-cases/create-checkout.server", () => ({ createCheckout: mocked.createCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: mocked.releaseCheckout }))
vi.mock("~/src/modules/checkout/use-cases/supersede-checkout-session.server", () => ({
  supersedeCheckoutSession: mocked.supersedeCheckoutSession,
}))
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/discount.checkout.server", () => ({ resolveCheckoutDiscount: () => Promise.resolve(undefined) }))
vi.mock("~/src/modules/discount/discount.claim.server", () => ({
  claimCheckoutDiscount: () => Promise.resolve(),
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
  reserveInventoryForItems: mocked.reserveInventoryForItems,
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  createPendingPayment: vi.fn(),
  getPaymentContextByTransactionId: mocked.getPaymentContextByTransactionId,
}))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getPublishedProductsWithInventoryByHandles: mocked.getPublishedProductsWithInventoryByHandles,
}))
vi.mock("~/src/modules/store-setting/store-setting.accessors", () => ({ isSalesPaused: () => Promise.resolve(false) }))
vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: mocked.clientAddress }))
vi.mock("~/src/lib/url", () => ({ resolveAssetURL: (source: string) => `https://assets.test/${source}` }))

import { TURNSTILE_ERROR_CODES } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"
import {
  HELD_LINES,
  TURNSTILE_TOKEN,
  availableVariant,
  catalogueProduct,
  createInput,
  pendingContext,
  updateInput,
} from "~/src/integrations/stripe/__test__/fixtures/checkout-session-inputs"
import { handleCreateCheckoutSession, handleUpdateCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { CHECKOUT_SESSION_LIFETIME_SECONDS } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { OPEN_CHECKOUTS_PER_CLIENT_ADDRESS_MAX, OPEN_CHECKOUTS_PER_EMAIL_MAX } from "~/src/modules/checkout/checkout.constants"

const VISITOR_IP = "2001:db8::1"

const VISITOR_ADDRESS = "2001:0db8:0000:0000:0000:0000:0000:0000"

const TOO_MANY_OPEN_CHECKOUTS = { code: ERROR_CODES.TOO_MANY_REQUESTS, message: CHECKOUT_ERROR_CODES.TOO_MANY_OPEN_CHECKOUTS }

const shopRequest = (): Request =>
  new Request("https://martebizuteria.pl/_serverFn/checkout", { headers: { "cf-connecting-ip": VISITOR_IP } })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("MODE", "production")
  mocked.getRequest.mockReturnValue(shopRequest())
  mocked.clientAddress.mockReturnValue(VISITOR_ADDRESS)
  mocked.verifyTurnstileToken.mockResolvedValue(undefined)
  mocked.fetchPointByName.mockImplementation((name) => Promise.resolve({ name }))
  mocked.countOpenCheckouts.mockResolvedValue({ byClientAddress: 0, byEmail: 0 })
  mocked.getRequestSession.mockResolvedValue(null)
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1500, type: "courier" })
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.reserveInventoryForItems.mockResolvedValue(undefined)
  mocked.createCheckout.mockResolvedValue({ checkoutId: "checkout-1", discountClaimed: false })
  mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_300, client_secret: "cs_secret_1", id: "cs_new" })
  mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ userId: undefined }))
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "open" })
  mocked.checkoutSessionsExpire.mockResolvedValue({})
  mocked.supersedeCheckoutSession.mockResolvedValue(true)
  mocked.releaseCheckout.mockResolvedValue(true)
  mocked.reserveInventoryByVariantLines.mockResolvedValue(undefined)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const expectNothingHeld = (): void => {
  expect(mocked.ensureStripeCustomer).not.toHaveBeenCalled()
  expect(mocked.getPublishedProductsWithInventoryByHandles).not.toHaveBeenCalled()
  expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
  expect(mocked.createCheckout).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
}

describe("handleCreateCheckoutSession bot check", () => {
  it("checks the Turnstile token for the checkout action on the host the shopper is on, from the shopper's own IP", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.verifyTurnstileToken).toHaveBeenCalledExactlyOnceWith({
      action: "checkout",
      hostname: "martebizuteria.pl",
      remoteIp: VISITOR_IP,
      token: TURNSTILE_TOKEN,
    })
  })

  it("holds no stock and opens no payment when the token does not pass", async () => {
    const refusal = new AppError(ERROR_CODES.FORBIDDEN, TURNSTILE_ERROR_CODES.BOT_CHECK_FAILED)
    mocked.verifyTurnstileToken.mockRejectedValue(refusal)

    await expect(handleCreateCheckoutSession(createInput())).rejects.toBe(refusal)

    expect(mocked.countOpenCheckouts).not.toHaveBeenCalled()
    expectNothingHeld()
  })

  it("asks InPost about a parcel locker only once the token has passed and the open checkouts are counted", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1499, type: "locker" })

    await handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId: "WAW01M" }))

    expect(mocked.fetchPointByName).toHaveBeenCalledExactlyOnceWith("WAW01M")
    expect(mocked.verifyTurnstileToken).toHaveBeenCalledBefore(mocked.fetchPointByName)
    expect(mocked.countOpenCheckouts).toHaveBeenCalledBefore(mocked.fetchPointByName)
  })

  it("never asks InPost about the parcel locker of a request whose token does not pass", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1499, type: "locker" })
    mocked.verifyTurnstileToken.mockRejectedValue(new AppError(ERROR_CODES.FORBIDDEN, TURNSTILE_ERROR_CODES.BOT_CHECK_FAILED))

    await expect(handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId: "WAW01M" }))).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
    })

    expect(mocked.fetchPointByName).not.toHaveBeenCalled()
  })
})

describe("handleCreateCheckoutSession open checkout limits", () => {
  it("counts the open checkouts of the shopper's address, as the rate limit keys it, and email before holding anything", async () => {
    await handleCreateCheckoutSession(createInput({ email: "anna@example.com" }))

    expect(mocked.clientAddress).toHaveBeenCalledWith(shopRequest().headers)
    expect(mocked.countOpenCheckouts).toHaveBeenCalledExactlyOnceWith({ clientAddress: VISITOR_ADDRESS, email: "anna@example.com" })
    expect(mocked.countOpenCheckouts).toHaveBeenCalledBefore(mocked.reserveInventoryForItems)
    expect(mocked.verifyTurnstileToken).toHaveBeenCalledBefore(mocked.countOpenCheckouts)
  })

  it("opens one more checkout while both counts are below their limits and records the address on it", async () => {
    mocked.countOpenCheckouts.mockResolvedValue({
      byClientAddress: OPEN_CHECKOUTS_PER_CLIENT_ADDRESS_MAX - 1,
      byEmail: OPEN_CHECKOUTS_PER_EMAIL_MAX - 1,
    })

    await expect(handleCreateCheckoutSession(createInput())).resolves.toMatchObject({ sessionId: "cs_new" })
    expect(mocked.createCheckout.mock.lastCall?.[0].clientAddress).toBe(VISITOR_ADDRESS)
  })

  it("refuses a checkout from an address that already has the most open checkouts it may hold", async () => {
    mocked.countOpenCheckouts.mockResolvedValue({ byClientAddress: OPEN_CHECKOUTS_PER_CLIENT_ADDRESS_MAX, byEmail: 0 })

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject(TOO_MANY_OPEN_CHECKOUTS)
    expectNothingHeld()
  })

  it("refuses a checkout for an email that already has the most open checkouts it may hold", async () => {
    mocked.countOpenCheckouts.mockResolvedValue({ byClientAddress: 0, byEmail: OPEN_CHECKOUTS_PER_EMAIL_MAX })

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject(TOO_MANY_OPEN_CHECKOUTS)
    expectNothingHeld()
  })
})

describe("handleUpdateCheckoutSession and the abuse limits", () => {
  const CHECKOUT_OPENED_AT = Date.UTC(2026, 9, 10, 12, 0, 0)

  const ONE_HOLD_MILLISECONDS = CHECKOUT_SESSION_LIFETIME_SECONDS * 1000

  const SESSION_CLOSED = { code: ERROR_CODES.CONFLICT, message: CHECKOUT_ERROR_CODES.SESSION_CLOSED }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    mocked.getPaymentContextByTransactionId.mockResolvedValue(
      pendingContext({ checkoutCreatedAt: new Date(CHECKOUT_OPENED_AT), userId: undefined }),
    )
    mocked.checkoutSessionsExpire.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "expired" })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("continues a checkout opened less than one hold ago without a new bot check or a count of open checkouts", async () => {
    vi.setSystemTime(CHECKOUT_OPENED_AT + ONE_HOLD_MILLISECONDS - 1)
    mocked.countOpenCheckouts.mockResolvedValue({
      byClientAddress: OPEN_CHECKOUTS_PER_CLIENT_ADDRESS_MAX,
      byEmail: OPEN_CHECKOUTS_PER_EMAIL_MAX,
    })

    await expect(handleUpdateCheckoutSession(updateInput())).resolves.toMatchObject({ sessionId: "cs_new" })
    expect(mocked.verifyTurnstileToken).not.toHaveBeenCalled()
    expect(mocked.countOpenCheckouts).not.toHaveBeenCalled()
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
  })

  it("will not renew the hold of a checkout opened one hold ago, so keeping stock longer takes a new checkout and a new bot check", async () => {
    vi.setSystemTime(CHECKOUT_OPENED_AT + ONE_HOLD_MILLISECONDS)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject(SESSION_CLOSED)
    expect(mocked.getPublishedProductsWithInventoryByHandles).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
    expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
    expect(mocked.reserveInventoryByVariantLines).not.toHaveBeenCalled()
    expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
  })

  it("expires that checkout's session and returns its stock first, so the shopper's fresh checkout can take the same pieces", async () => {
    vi.setSystemTime(CHECKOUT_OPENED_AT + ONE_HOLD_MILLISECONDS)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject(SESSION_CLOSED)
    expect(mocked.checkoutSessionsExpire).toHaveBeenCalledExactlyOnceWith("cs_old")
    expect(mocked.releaseCheckout).toHaveBeenCalledExactlyOnceWith({ lines: HELD_LINES, transactionId: "cs_old" })
    expect(mocked.checkoutSessionsExpire).toHaveBeenCalledBefore(mocked.releaseCheckout)
  })

  it("keeps the stock of an old checkout's session that Stripe will not expire, since it may still be paid", async () => {
    const failure = new Error("This Checkout Session is no longer open")
    vi.setSystemTime(CHECKOUT_OPENED_AT + ONE_HOLD_MILLISECONDS)
    mocked.checkoutSessionsExpire.mockRejectedValue(failure)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toBe(failure)
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
    expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  })

  it("still reports a session paid before its webhook as paid, however old its checkout is", async () => {
    vi.setSystemTime(CHECKOUT_OPENED_AT + 2 * ONE_HOLD_MILLISECONDS)
    mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "complete" })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_COMPLETE,
    })
    expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
  })

  it("leaves a session whose BLIK payment the bank is still confirming open with its stock, however old its checkout is", async () => {
    vi.setSystemTime(CHECKOUT_OPENED_AT + 2 * ONE_HOLD_MILLISECONDS)
    mocked.checkoutSessionsRetrieve.mockResolvedValue({
      id: "cs_old",
      metadata: { items: JSON.stringify(HELD_LINES) },
      payment_intent: { next_action: { type: "blik_authorize" }, status: "requires_action" },
      status: "open",
    })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_PROCESSING,
    })
    expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
    expect(mocked.verifyTurnstileToken).not.toHaveBeenCalled()
  })
})
