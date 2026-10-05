import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn<(params: { line_items: unknown[] }) => Promise<unknown>>(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  createCheckout: vi.fn<(input: { checkoutValues: { lockerId?: string | undefined } }) => Promise<string>>(),
  ensureStripeCustomer: vi.fn<() => Promise<string>>(),
  getOfferedDeliveryMethodByIdQuery: vi.fn<(id: string) => Promise<{ price: number; type: string } | undefined>>(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  getStripeCustomerId: vi.fn<() => Promise<string | undefined>>(),
  reserveInventoryByVariantLines: vi.fn(),
  reserveInventoryForItems: vi.fn(),
  supersedeCheckoutSession: vi.fn(),
  updateCheckoutDelivery: vi.fn<(checkoutId: string, checkoutValues: { lockerId?: string | undefined }) => Promise<void>>(),
}))

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
  ensureStripeCustomer: mocked.ensureStripeCustomer,
  getStripeCustomerId: mocked.getStripeCustomerId,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/modules/checkout/use-cases/create-checkout.server", () => ({ createCheckout: mocked.createCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: vi.fn() }))
vi.mock("~/src/modules/checkout/use-cases/supersede-checkout-session.server", () => ({
  supersedeCheckoutSession: mocked.supersedeCheckoutSession,
}))
vi.mock("~/src/modules/checkout/use-cases/update-checkout-delivery.server", () => ({
  updateCheckoutDelivery: mocked.updateCheckoutDelivery,
}))
vi.mock("~/src/modules/discount/discount.checkout.server", () => ({ resolveCheckoutDiscount: () => Promise.resolve(undefined) }))
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
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const PARCEL_LOCKER = { price: 1499, type: "locker" }

const COURIER = { price: 1999, type: "courier" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  mocked.getRequest.mockReturnValue(requestOn("http://127.0.0.1:3000"))
  mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1", name: "Anna Kowalska" } })
  mocked.ensureStripeCustomer.mockResolvedValue("cus_1")
  mocked.getStripeCustomerId.mockResolvedValue("cus_1")
  mocked.reserveInventoryByVariantLines.mockResolvedValue(undefined)
  mocked.reserveInventoryForItems.mockResolvedValue(undefined)
  mocked.supersedeCheckoutSession.mockResolvedValue(true)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(COURIER)
  mocked.createCheckout.mockResolvedValue("checkout-1")
  mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_799, client_secret: "cs_secret_1", id: "cs_new" })
  mocked.checkoutSessionsExpire.mockResolvedValue({})
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ metadata: { items: JSON.stringify(HELD_LINES) }, status: "open" })
  mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext())
})

afterEach(() => {
  vi.restoreAllMocks()
})

const expectNewCheckoutUntouched = (): void => {
  expect(mocked.ensureStripeCustomer).not.toHaveBeenCalled()
  expect(mocked.getPublishedProductsWithInventoryByHandles).not.toHaveBeenCalled()
  expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
  expect(mocked.createCheckout).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
}

const expectHeldSessionUntouched = (): void => {
  expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
  expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
  expect(mocked.reserveInventoryByVariantLines).not.toHaveBeenCalled()
  expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
}

const savedLockerId = (): string | undefined => mocked.createCheckout.mock.lastCall?.[0].checkoutValues.lockerId

describe("delivery method a new checkout names", () => {
  it("looks up the method the shopper chose among the ones the shop offers", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.getOfferedDeliveryMethodByIdQuery).toHaveBeenCalledExactlyOnceWith("dpd-courier")
  })

  it("refuses a method the shop no longer offers before touching Stripe or stock, instead of shipping it for free", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(undefined)

    await expect(handleCreateCheckoutSession(createInput())).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: CHECKOUT_ERROR_CODES.DELIVERY_METHOD_UNAVAILABLE,
    })
    expectNewCheckoutUntouched()
  })

  it("charges the price the database holds for the method as its own line", async () => {
    await handleCreateCheckoutSession(createInput())

    expect(mocked.checkoutSessionsCreate.mock.lastCall?.[0].line_items).toContainEqual({
      price_data: { currency: "pln", product_data: { name: "Shipping" }, unit_amount: 1999 },
      quantity: 1,
    })
  })
})

describe("parcel locker a new checkout names", () => {
  it("refuses a parcel-locker method without a locker even when the browser claims a courier delivery", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

    await expect(handleCreateCheckoutSession(createInput({ deliveryMethodType: "courier" }))).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: CHECKOUT_ERROR_CODES.LOCKER_REQUIRED,
    })
    expectNewCheckoutUntouched()
  })

  it.each([["   "], ["WAW 01M"], ["<b>WAW01M</b>"], ["W1"], ["W".repeat(33)]])(
    "refuses %j as the locker of a parcel-locker method",
    async (lockerId) => {
      mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

      await expect(handleCreateCheckoutSession(createInput({ lockerId }))).rejects.toMatchObject({
        message: CHECKOUT_ERROR_CODES.LOCKER_REQUIRED,
      })
    },
  )

  it.each([["KRA01M"], ["WAW22A"], ["POP-WAW123"], ["BCH01APP"]])(
    "records the InPost point %s for a parcel-locker method",
    async (lockerId) => {
      mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

      await handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId }))

      expect(savedLockerId()).toBe(lockerId)
    },
  )

  it("records the locker without the whitespace around it", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

    await handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId: " WAW01M " }))

    expect(savedLockerId()).toBe("WAW01M")
  })

  it("drops a locker the browser kept from an earlier choice when the method is not a parcel locker", async () => {
    await handleCreateCheckoutSession(createInput({ deliveryMethodType: "courier", lockerId: "WAW01M" }))

    expect(mocked.createCheckout.mock.lastCall?.[0].checkoutValues).toMatchObject({ deliveryMethod: "dpd-courier", lockerId: undefined })
  })
})

describe("delivery an edited checkout names", () => {
  it("refuses a method the shop no longer offers and leaves the held session and its stock alone", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(undefined)

    await expect(handleUpdateCheckoutSession(updateInput())).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: CHECKOUT_ERROR_CODES.DELIVERY_METHOD_UNAVAILABLE,
    })
    expectHeldSessionUntouched()
  })

  it("refuses a parcel-locker method without a locker and leaves the held session alone", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

    await expect(handleUpdateCheckoutSession(updateInput({ deliveryMethodType: "courier" }))).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.LOCKER_REQUIRED,
    })
    expectHeldSessionUntouched()
  })

  it("saves the trimmed locker for a parcel-locker method", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

    await handleUpdateCheckoutSession(updateInput({ deliveryMethodType: "locker", lockerId: " KRA01M " }))

    expect(mocked.updateCheckoutDelivery.mock.lastCall?.[1].lockerId).toBe("KRA01M")
  })

  it("clears the locker when the edited checkout switches to a courier", async () => {
    await handleUpdateCheckoutSession(updateInput({ deliveryMethodType: "courier", lockerId: "KRA01M" }))

    expect(mocked.updateCheckoutDelivery.mock.lastCall?.[1]).toMatchObject({ deliveryMethod: "dpd-courier", lockerId: undefined })
  })
})
