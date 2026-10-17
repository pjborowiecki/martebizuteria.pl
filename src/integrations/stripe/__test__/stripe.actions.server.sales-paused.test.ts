import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  claimCheckoutDiscount: vi.fn(),
  createCheckout: vi.fn(),
  ensureStripeCustomerWithEmail: vi.fn(),
  getHeldLinesByTransactionId: vi.fn(),
  getOfferedDeliveryMethodByIdQuery: vi.fn(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  isSalesPaused: vi.fn<() => Promise<boolean>>(),
  releaseCheckout: vi.fn(),
  reserveInventoryForItems: vi.fn(),
  resolveCheckoutDiscount: vi.fn(),
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
  },
}))
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({
  ensureStripeCustomerWithEmail: mocked.ensureStripeCustomerWithEmail,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/modules/checkout/use-cases/create-checkout.server", () => ({ createCheckout: mocked.createCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: mocked.releaseCheckout }))
vi.mock("~/src/modules/checkout/use-cases/supersede-checkout-session.server", () => ({
  supersedeCheckoutSession: mocked.supersedeCheckoutSession,
}))
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/discount.checkout.server", () => ({ resolveCheckoutDiscount: mocked.resolveCheckoutDiscount }))
vi.mock("~/src/modules/discount/discount.claim.server", () => ({
  claimCheckoutDiscount: mocked.claimCheckoutDiscount,
  keepClaimedDiscount: vi.fn(),
  releaseDiscountClaims: vi.fn(),
  releaseUnappliedDiscountClaims: vi.fn(),
}))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getOfferedDeliveryMethodByIdQuery: mocked.getOfferedDeliveryMethodByIdQuery,
}))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ releaseInventoryForItems: vi.fn() }))
vi.mock("~/src/modules/inventory/inventory.utils", () => ({
  reserveInventoryForItems: mocked.reserveInventoryForItems,
}))
vi.mock("~/src/modules/payment/payment.accessors", () => ({
  createPendingPayment: vi.fn(),
  getHeldLinesByTransactionId: mocked.getHeldLinesByTransactionId,
  getPaymentContextByTransactionId: mocked.getPaymentContextByTransactionId,
}))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getPublishedProductsWithInventoryByHandles: mocked.getPublishedProductsWithInventoryByHandles,
}))
vi.mock("~/src/modules/store-setting/store-setting.accessors", () => ({ isSalesPaused: mocked.isSalesPaused }))
vi.mock("~/src/modules/checkout/use-cases/count-open-checkouts.server", () => ({
  countOpenCheckouts: () => Promise.resolve({ byClientAddress: 0, byEmail: 0 }),
}))
vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: () => "203.0.113.7" }))
vi.mock("~/src/modules/user-email-history/user-email-history.accessors", () => ({
  resolveAccountAddress: ({ email }: { email: string }) => Promise.resolve(email),
}))
vi.mock("~/src/lib/url", () => ({ resolveAssetURL: (source: string) => `https://assets.test/${source}` }))

import {
  HELD_LINES,
  availableVariant,
  catalogueProduct,
  createInput,
  pendingContext,
  requestOn,
  updateInput,
} from "~/src/integrations/stripe/__test__/fixtures/checkout-session-inputs"
import { handleCreateCheckoutSession, handleUpdateCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { CHECKOUT_SESSION_LIFETIME_SECONDS } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const SALES_PAUSED_REFUSAL = { code: ERROR_CODES.CONFLICT, message: CHECKOUT_ERROR_CODES.SALES_PAUSED }

beforeEach(() => {
  mocked.getHeldLinesByTransactionId.mockResolvedValue(HELD_LINES)
  vi.clearAllMocks()
  mocked.isSalesPaused.mockResolvedValue(true)
  mocked.getRequest.mockReturnValue(requestOn("http://127.0.0.1:3000"))
  mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1", name: "Anna Kowalska" } })
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1500, type: "courier" })
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext())
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "open" })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const expectNothingHeldOrCharged = (): void => {
  expect(mocked.resolveCheckoutDiscount).not.toHaveBeenCalled()
  expect(mocked.claimCheckoutDiscount).not.toHaveBeenCalled()
  expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
  expect(mocked.createCheckout).not.toHaveBeenCalled()
  expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
  expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
  expect(mocked.scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
}

describe("handleCreateCheckoutSession while sales are paused", () => {
  it("refuses a new checkout before it looks up the customer, the catalogue or the stock", async () => {
    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject(SALES_PAUSED_REFUSAL)

    expect(mocked.getOfferedDeliveryMethodByIdQuery).not.toHaveBeenCalled()
    expect(mocked.ensureStripeCustomerWithEmail).not.toHaveBeenCalled()
    expect(mocked.getPublishedProductsWithInventoryByHandles).not.toHaveBeenCalled()
    expectNothingHeldOrCharged()
  })
})

describe("handleUpdateCheckoutSession while sales are paused", () => {
  it("refuses to replace an open session and leaves it and its stock as they were", async () => {
    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject(SALES_PAUSED_REFUSAL)

    expect(mocked.getPublishedProductsWithInventoryByHandles).not.toHaveBeenCalled()
    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
    expectNothingHeldOrCharged()
  })

  it("leaves the open session of a checkout too old to edit payable, as every session opened before the pause", async () => {
    const twoHoldsAgo = new Date(Date.now() - 2 * CHECKOUT_SESSION_LIFETIME_SECONDS * 1000)
    mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext({ checkoutCreatedAt: twoHoldsAgo }))

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject(SALES_PAUSED_REFUSAL)

    expect(mocked.releaseCheckout).not.toHaveBeenCalled()
    expectNothingHeldOrCharged()
  })

  it("still reports a session the customer has already paid as paid, so they see their confirmation", async () => {
    mocked.checkoutSessionsRetrieve.mockResolvedValue({ id: "cs_old", metadata: { items: JSON.stringify(HELD_LINES) }, status: "complete" })

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CHECKOUT_ERROR_CODES.SESSION_COMPLETE,
    })
    expectNothingHeldOrCharged()
  })

  it("still reports a closed session as closed, so the browser's fresh checkout is the one refused", async () => {
    mocked.getPaymentContextByTransactionId.mockResolvedValue(undefined)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: CHECKOUT_ERROR_CODES.SESSION_CLOSED,
    })
    expectNothingHeldOrCharged()
  })
})

describe("checkout session handlers once sales resume", () => {
  it("opens a checkout again as soon as the switch is off", async () => {
    mocked.isSalesPaused.mockResolvedValue(false)
    mocked.ensureStripeCustomerWithEmail.mockResolvedValue("cus_1")
    mocked.reserveInventoryForItems.mockResolvedValue(undefined)
    mocked.createCheckout.mockResolvedValue({ checkoutId: "checkout-1", discountClaimed: false })
    mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_300, client_secret: "cs_secret_1", id: "cs_new" })

    await expect(handleCreateCheckoutSession(createInput())).resolves.toMatchObject({ sessionId: "cs_new" })
    expect(mocked.reserveInventoryForItems).toHaveBeenCalledOnce()
  })
})
