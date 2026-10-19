import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn<(params: { line_items: unknown[] }) => Promise<unknown>>(),
  checkoutSessionsExpire: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  createCheckout:
    vi.fn<
      (input: {
        checkoutValues: { lockerId?: string | undefined }
        lockerPoint?: string | undefined
        lockerUnconfirmed?: boolean | undefined
      }) => Promise<{ checkoutId: string; discountClaimed: boolean }>
    >(),
  ensureStripeCustomerWithEmail: vi.fn<() => Promise<string>>(),
  fetchPointByName: vi.fn<(name: string) => Promise<object | undefined>>(),
  getHeldLinesByTransactionId: vi.fn(),
  getOfferedDeliveryMethodByIdQuery: vi.fn<(id: string) => Promise<{ price: number; type: string } | undefined>>(),
  getPaymentContextByTransactionId: vi.fn(),
  getPublishedProductsWithInventoryByHandles: vi.fn(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  requestLocale: { value: "pl-PL" },
  reserveInventoryForItems: vi.fn(),
  supersedeCheckoutSession: vi.fn(),
  updateCheckoutDelivery:
    vi.fn<
      (
        checkoutId: string,
        checkoutValues: { lockerId?: string | undefined },
        resolved?: { discountId?: string | undefined; lockerPoint?: string | undefined; lockerUnconfirmed?: boolean | undefined },
      ) => Promise<void>
    >(),
}))

vi.mock("cloudflare:workers", () => ({ env: { APP_ENV: "preview" } }))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocked.getRequest }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: mocked.getRequestSession }))
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
vi.mock("~/src/modules/discount/use-cases/resolve-checkout-discount.server", () => ({
  resolveCheckoutDiscount: () => Promise.resolve(undefined),
}))
vi.mock("~/src/modules/discount/use-cases/claim-checkout-discount.server", () => ({
  claimCheckoutDiscount: () => Promise.resolve(),
  keepClaimedDiscount: vi.fn(),
  releaseDiscountClaims: vi.fn(),
  releaseUnappliedDiscountClaims: vi.fn(),
}))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getOfferedDeliveryMethodByIdQuery: mocked.getOfferedDeliveryMethodByIdQuery,
}))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ releaseInventoryForItems: vi.fn() }))
vi.mock("~/src/modules/inventory/use-cases/reserve-inventory.server", () => ({
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

const PAID_PICKUP = { price: 500, type: "in_store" }

beforeEach(() => {
  mocked.getHeldLinesByTransactionId.mockResolvedValue(HELD_LINES)
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  mocked.getRequest.mockReturnValue(requestOn("http://127.0.0.1:3000"))
  mocked.getRequestSession.mockResolvedValue({ user: { id: "user-1", name: "Anna Kowalska" } })
  mocked.ensureStripeCustomerWithEmail.mockResolvedValue("cus_1")
  mocked.reserveInventoryForItems.mockResolvedValue(undefined)
  mocked.supersedeCheckoutSession.mockResolvedValue(true)
  mocked.updateCheckoutDelivery.mockResolvedValue(undefined)
  mocked.getPublishedProductsWithInventoryByHandles.mockResolvedValue([catalogueProduct([availableVariant()])])
  mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(COURIER)
  mocked.createCheckout.mockResolvedValue({ checkoutId: "checkout-1", discountClaimed: false })
  mocked.fetchPointByName.mockImplementation((name) =>
    Promise.resolve({
      address_details: { building_number: "1", city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Marszałkowska" },
      location: { latitude: 52.2, longitude: 21 },
      location_description: "Przy Żabce",
      name,
    }),
  )
  mocked.checkoutSessionsCreate.mockResolvedValue({ amount_total: 51_799, client_secret: "cs_secret_1", id: "cs_new" })
  mocked.checkoutSessionsExpire.mockResolvedValue({})
  mocked.checkoutSessionsRetrieve.mockResolvedValue({ metadata: { items: JSON.stringify(HELD_LINES) }, status: "open" })
  mocked.getPaymentContextByTransactionId.mockResolvedValue(pendingContext())
})

afterEach(() => {
  vi.restoreAllMocks()
  mocked.requestLocale.value = "pl-PL"
})

const expectNewCheckoutUntouched = (): void => {
  expect(mocked.ensureStripeCustomerWithEmail).not.toHaveBeenCalled()
  expect(mocked.getPublishedProductsWithInventoryByHandles).not.toHaveBeenCalled()
  expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
  expect(mocked.createCheckout).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
}

const expectHeldSessionUntouched = (): void => {
  expect(mocked.checkoutSessionsCreate).not.toHaveBeenCalled()
  expect(mocked.checkoutSessionsExpire).not.toHaveBeenCalled()
  expect(mocked.supersedeCheckoutSession).not.toHaveBeenCalled()
  expect(mocked.reserveInventoryForItems).not.toHaveBeenCalled()
  expect(mocked.updateCheckoutDelivery).not.toHaveBeenCalled()
}

const savedLockerId = (): string | undefined => mocked.createCheckout.mock.lastCall?.[0].checkoutValues.lockerId

const sessionLineItems = (): unknown[] | undefined => mocked.checkoutSessionsCreate.mock.lastCall?.[0].line_items

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

    expect(sessionLineItems()).toContainEqual({
      price_data: { currency: "pln", product_data: { name: "Dostawa kurierem" }, unit_amount: 1999 },
      quantity: 1,
    })
  })
})

describe("delivery line the receipt names", () => {
  it.each([
    { locale: "pl-PL", method: COURIER, name: "Dostawa kurierem" },
    { locale: "pl-PL", method: PARCEL_LOCKER, name: "Dostawa do Paczkomatu InPost" },
    { locale: "pl-PL", method: PAID_PICKUP, name: "Odbiór osobisty" },
    { locale: "en-US", method: COURIER, name: "Courier delivery" },
    { locale: "en-US", method: PARCEL_LOCKER, name: "InPost Parcel Locker delivery" },
    { locale: "en-US", method: PAID_PICKUP, name: "In-store pickup" },
  ])("names the $method.type line $name in $locale", async ({ locale, method, name }) => {
    mocked.requestLocale.value = locale
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(method)

    await handleCreateCheckoutSession(createInput({ deliveryMethodType: method.type, lockerId: "KRA01M" }))

    expect(sessionLineItems()).toContainEqual({
      price_data: { currency: "pln", product_data: { name }, unit_amount: method.price },
      quantity: 1,
    })
  })

  it("names the delivery of an edited checkout in the shopper's language on the replacement session", async () => {
    mocked.requestLocale.value = "en-US"
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

    await handleUpdateCheckoutSession(updateInput({ deliveryMethodType: "locker", lockerId: "KRA01M" }))

    expect(sessionLineItems()).toContainEqual({
      price_data: { currency: "pln", product_data: { name: "InPost Parcel Locker delivery" }, unit_amount: 1499 },
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
    expect(mocked.createCheckout.mock.lastCall?.[0].lockerUnconfirmed).toBe(false)
    expect(mocked.fetchPointByName).not.toHaveBeenCalled()
  })
})

const LOCKER_POINT = { buildingNumber: "1", city: "Warszawa", description: "Przy Żabce", postalCode: "00-001", street: "Marszałkowska" }

describe("parcel locker InPost is asked about for a new checkout", () => {
  beforeEach(() => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)
  })

  it("asks InPost for the trimmed locker and saves it as confirmed when InPost lists it", async () => {
    await handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId: " WAW01M " }))

    expect(mocked.fetchPointByName).toHaveBeenCalledExactlyOnceWith("WAW01M")
    expect(mocked.createCheckout.mock.lastCall?.[0].lockerUnconfirmed).toBe(false)
    expect(JSON.parse(mocked.createCheckout.mock.lastCall?.[0].lockerPoint ?? "null")).toStrictEqual(LOCKER_POINT)
  })

  it("refuses a locker InPost does not list before touching Stripe or stock", async () => {
    mocked.fetchPointByName.mockResolvedValue(undefined)

    await expect(handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId: "WAW99X" }))).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: CHECKOUT_ERROR_CODES.LOCKER_NOT_FOUND,
    })
    expectNewCheckoutUntouched()
  })

  it("does not ask InPost about a locker id of the wrong shape", async () => {
    await expect(handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId: "W1" }))).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.LOCKER_REQUIRED,
    })
    expect(mocked.fetchPointByName).not.toHaveBeenCalled()
  })

  it("opens the payment with the locker flagged unconfirmed when InPost cannot answer", async () => {
    const outage = new Error("InPost API error: 503")
    mocked.fetchPointByName.mockRejectedValue(outage)

    await handleCreateCheckoutSession(createInput({ deliveryMethodType: "locker", lockerId: "WAW01M" }))

    expect(mocked.createCheckout.mock.lastCall?.[0]).toMatchObject({
      checkoutValues: { lockerId: "WAW01M" },
      lockerPoint: undefined,
      lockerUnconfirmed: true,
    })
    expect(mocked.checkoutSessionsCreate).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith(
      "InPost could not confirm parcel locker WAW01M, so the order asks the shop to check it:",
      outage,
    )
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
    expect(mocked.updateCheckoutDelivery.mock.lastCall?.[2]?.lockerUnconfirmed).toBe(false)
  })

  it("saves a locker InPost lists as confirmed", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)

    await handleUpdateCheckoutSession(updateInput({ deliveryMethodType: "locker", lockerId: "KRA01M" }))

    expect(mocked.fetchPointByName).toHaveBeenCalledExactlyOnceWith("KRA01M")
    expect(mocked.updateCheckoutDelivery.mock.lastCall?.[2]?.lockerUnconfirmed).toBe(false)
    expect(JSON.parse(mocked.updateCheckoutDelivery.mock.lastCall?.[2]?.lockerPoint ?? "null")).toStrictEqual(LOCKER_POINT)
  })

  it("refuses a locker InPost does not list and leaves the held session alone", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)
    mocked.fetchPointByName.mockResolvedValue(undefined)

    await expect(handleUpdateCheckoutSession(updateInput({ deliveryMethodType: "locker", lockerId: "KRA99X" }))).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: CHECKOUT_ERROR_CODES.LOCKER_NOT_FOUND,
    })
    expectHeldSessionUntouched()
  })

  it("saves the locker flagged unconfirmed when InPost cannot answer", async () => {
    mocked.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(PARCEL_LOCKER)
    mocked.fetchPointByName.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"))

    await handleUpdateCheckoutSession(updateInput({ deliveryMethodType: "locker", lockerId: "KRA01M" }))

    expect(mocked.updateCheckoutDelivery.mock.lastCall?.[1].lockerId).toBe("KRA01M")
    expect(mocked.updateCheckoutDelivery.mock.lastCall?.[2]?.lockerUnconfirmed).toBe(true)
  })
})
