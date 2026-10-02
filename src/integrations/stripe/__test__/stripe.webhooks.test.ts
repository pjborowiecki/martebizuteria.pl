import { type ComponentProps, type ReactElement } from "react"

import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

type OrderConfirmationElement = ReactElement<ComponentProps<typeof OrderConfirmation>>

const {
  clearOrderDispute,
  couponsDel,
  couponsRetrieve,
  flagOrderDispute,
  fulfillCheckout,
  getCheckoutEmailContext,
  getOrderTotalsForEmail,
  paymentIntentsRetrieve,
  recordEmailFailedAudit,
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderEmailOutcome,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderPlacedAudit,
  recordOrderReleasedAudit,
  refundOrder,
  releaseCheckout,
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
  sendEmail,
  sessionsList,
} = vi.hoisted(() => ({
  clearOrderDispute: vi.fn<(transactionId: string) => Promise<void>>(),
  couponsDel: vi.fn<(couponId: string) => Promise<{ deleted: true; id: string }>>(),
  couponsRetrieve: vi.fn<(couponId: string) => Promise<Pick<Stripe.Coupon, "id" | "metadata">>>(),
  flagOrderDispute: vi.fn<(transactionId: string, dispute: object) => Promise<void>>(),
  fulfillCheckout: vi.fn<(input: object) => Promise<string | undefined>>(),
  getCheckoutEmailContext: vi.fn<(checkoutId: string) => Promise<object | undefined>>(),
  getOrderTotalsForEmail: vi.fn<(orderId: string) => Promise<Record<string, unknown> | undefined>>(),
  paymentIntentsRetrieve: vi.fn<(id: string, params: object) => Promise<{ payment_method: { type: string } | null }>>(),
  recordEmailFailedAudit: vi.fn(),
  recordOrderDisputeClosedAudit: vi.fn(),
  recordOrderDisputeOpenedAudit: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  recordOrderPaymentCapturedAudit: vi.fn(),
  recordOrderPaymentFailedAudit: vi.fn(),
  recordOrderPlacedAudit: vi.fn(),
  recordOrderReleasedAudit: vi.fn(),
  refundOrder: vi.fn<(input: object) => Promise<void>>(),
  releaseCheckout: vi.fn<(input: object) => Promise<void>>(),
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: vi.fn(),
  sendEmail: vi.fn<(options: Readonly<{ react: OrderConfirmationElement; subject: string; to: string }>) => Promise<string | undefined>>(),
  sessionsList: vi.fn<(params: object) => Promise<{ data: { id: string }[] }>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: {
    checkout: { sessions: { list: sessionsList } },
    coupons: { del: couponsDel, retrieve: couponsRetrieve },
    paymentIntents: { retrieve: paymentIntentsRetrieve },
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordEmailFailedAudit,
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderEmailOutcome,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderPlacedAudit,
  recordOrderReleasedAudit,
}))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutEmailContext }))
vi.mock("~/src/modules/checkout/use-cases/fulfill-checkout.server", () => ({ fulfillCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderTotalsForEmail }))
vi.mock("~/src/modules/order/use-cases/clear-order-dispute", () => ({ clearOrderDispute }))
vi.mock("~/src/modules/order/use-cases/flag-order-dispute", () => ({ flagOrderDispute }))
vi.mock("~/src/modules/order/use-cases/refund-order", () => ({ refundOrder }))

import { STRIPE_WEBHOOK_EVENTS } from "~/src/integrations/stripe/stripe.constants"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import {
  charge,
  chargeDisputeClosedEvent,
  chargeDisputeCreatedEvent,
  chargeRefundedEvent,
  checkoutSession,
  checkoutSessionAsyncPaymentFailedEvent,
  checkoutSessionAsyncPaymentSucceededEvent,
  checkoutSessionCompletedEvent,
  checkoutSessionExpiredEvent,
  dispute,
  paymentIntent,
  paymentIntentFailedEvent,
} from "./fixtures/stripe-webhook-events"
import englishCopy from "~/messages/en-US/emails.order-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.order-confirmation.json"
import { OrderConfirmation } from "~/src/presentation/emails/order-confirmation"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})

const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

const fulfillmentLines = [
  {
    handle: "bransoletka-aurora",
    imageUrl: "products/aurora.jpg",
    price: 24_900,
    qty: 2,
    title: "Bransoletka Aurora",
    variantId: "var-aurora",
  },
]

const ITEMS_TOTAL = 49_800

const SHIPPING_TOTAL = 5000

const AMOUNT_TOTAL = ITEMS_TOTAL + SHIPPING_TOTAL

const paidSession = (metadata: Stripe.Metadata, email: string | null = "anna@example.com"): Stripe.Checkout.Session =>
  checkoutSession({ amountTotal: AMOUNT_TOTAL, customerEmail: email, metadata, paymentIntent: "pi_test_1" })

const itemsMetadata = JSON.stringify(fulfillmentLines)

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`no webhook handler is registered for ${event.type}`)
  }

  await handler(event)
}

const sentEmail = () => {
  const [call] = sendEmail.mock.calls
  if (call === undefined) {
    throw new Error("no confirmation email was sent")
  }

  return call[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  fulfillCheckout.mockResolvedValue("order-1")
  getOrderTotalsForEmail.mockResolvedValue({
    discountTotal: 0,
    orderNumber: "MRT-2026-00042",
    shippingTotal: SHIPPING_TOTAL,
    subtotal: ITEMS_TOTAL,
    taxBasisPoints: 2300,
    taxTotal: 12_080,
    total: AMOUNT_TOTAL,
  })
  getCheckoutEmailContext.mockResolvedValue(undefined)
  paymentIntentsRetrieve.mockResolvedValue({ payment_method: { type: "blik" } })
  releaseCheckout.mockResolvedValue(undefined)
  refundOrder.mockResolvedValue(undefined)
  flagOrderDispute.mockResolvedValue(undefined)
  clearOrderDispute.mockResolvedValue(undefined)
  sendEmail.mockResolvedValue(undefined)
  sessionsList.mockResolvedValue({ data: [{ id: "cs_resolved_1" }] })
  couponsDel.mockImplementation((couponId) => Promise.resolve({ deleted: true, id: couponId }))
  couponsRetrieve.mockImplementation((couponId) =>
    Promise.resolve({ id: couponId, metadata: { checkoutId: "chk-1", source: "marte_checkout" } }),
  )
})

describe("checkout session fulfillment", () => {
  it("registers a handler for every webhook event the integration subscribes to", () => {
    expect(Object.keys(webhookHandlers).toSorted()).toStrictEqual(Object.values(STRIPE_WEBHOOK_EVENTS).toSorted())
  })

  it("waits for settlement instead of fulfilling an unpaid session", async () => {
    await dispatch(checkoutSessionCompletedEvent(checkoutSession({ paymentStatus: "unpaid" })))

    expect(fulfillCheckout).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Session cs_test_1 completed with payment_status=unpaid; awaiting async settlement.")
  })

  it("fulfills a session that needs no payment", async () => {
    await dispatch(
      checkoutSessionCompletedEvent(
        checkoutSession({ amountTotal: AMOUNT_TOTAL, metadata: { items: itemsMetadata }, paymentStatus: "no_payment_required" }),
      ),
    )

    expect(fulfillCheckout).toHaveBeenCalledWith({
      currency: "PLN",
      lines: fulfillmentLines,
      locale: "pl-PL",
      paidAmount: AMOUNT_TOTAL,
      transactionId: "cs_test_1",
    })
  })

  it("uppercases the session currency and keeps the locale carried in the metadata", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(fulfillCheckout).toHaveBeenCalledWith({
      currency: "PLN",
      lines: fulfillmentLines,
      locale: "en-US",
      paidAmount: AMOUNT_TOTAL,
      transactionId: "cs_test_1",
    })
  })

  it("falls back to the default locale when the metadata locale is not supported", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "de-DE" })))

    expect(fulfillCheckout).toHaveBeenCalledWith(expect.objectContaining({ locale: "pl-PL" }))
  })

  it("treats a session without item metadata as an empty order", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({})))

    expect(fulfillCheckout).toHaveBeenCalledWith(expect.objectContaining({ lines: [] }))
  })

  it("rejects item metadata that does not match the fulfillment schema", async () => {
    const event = checkoutSessionCompletedEvent(paidSession({ items: JSON.stringify([{ qty: "two", variantId: "var-aurora" }]) }))

    await expect(dispatch(event)).rejects.toThrow()
    expect(fulfillCheckout).not.toHaveBeenCalled()
  })

  it("records the placed and captured audits and refreshes the admin and catalog caches", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(recordOrderPlacedAudit).toHaveBeenCalledWith("order-1", { detail: "anna@example.com", resourceId: "order-1" })
    expect(recordOrderPaymentCapturedAudit).toHaveBeenCalledWith("order-1", { detail: "548,00 PLN", resourceId: "order-1" })
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
    expect(scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
  })

  it("formats the captured amount for the locale the checkout was made in", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(recordOrderPaymentCapturedAudit).toHaveBeenCalledWith("order-1", { detail: "548.00 PLN", resourceId: "order-1" })
  })

  it("stops when the session matches no pending checkout", async () => {
    fulfillCheckout.mockResolvedValue(undefined)

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(recordOrderPlacedAudit).not.toHaveBeenCalled()
    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("fulfills a session whose asynchronous payment succeeded", async () => {
    await dispatch(checkoutSessionAsyncPaymentSucceededEvent(paidSession({ items: itemsMetadata })))

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(releaseCheckout).not.toHaveBeenCalled()
  })
})

describe("order confirmation email", () => {
  it("sends the confirmation to the address on the session in the store locale", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sentEmail().to).toBe("anna@example.com")
    expect(sentEmail().subject).toBe(polishCopy.subject)
    expect(sentEmail().react.type).toBe(OrderConfirmation)
    expect(sentEmail().react.props.locale).toBe("pl-PL")
  })

  it("translates the subject into the locale the checkout was made in", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(sentEmail().subject).toBe(englishCopy.subject)
    expect(sentEmail().react.props.locale).toBe("en-US")
  })

  it("reports the totals persisted on the order rather than re-deriving them", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    const { props } = sentEmail().react

    expect(getOrderTotalsForEmail).toHaveBeenCalledWith("order-1")
    expect(props.subtotal).toBe(ITEMS_TOTAL)
    expect(props.shippingTotal).toBe(SHIPPING_TOTAL)
    expect(props.total).toBe(AMOUNT_TOTAL)
    expect(props.taxTotal).toBe(12_080)
    expect(props.currency).toBe("PLN")
    expect(props.orderNumber).toBe("MRT-2026-00042")
  })

  it("falls back to the session total when the order row cannot be read back", async () => {
    getOrderTotalsForEmail.mockResolvedValue(undefined)
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    const { props } = sentEmail().react

    expect(props.total).toBe(AMOUNT_TOTAL)
    expect(props.orderNumber).toBe("order-1")
  })

  it("labels the payment method Stripe reports for the intent", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(paymentIntentsRetrieve).toHaveBeenCalledWith("pi_test_1", { expand: ["payment_method"] })
    expect(sentEmail().react.props.details.paymentMethod).toBe(polishCopy.paymentMethods.blik)
  })

  it("marks the delivery and address details unavailable while no checkout row is found", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    const { details } = sentEmail().react.props

    expect(details.billingAddress).toBe(polishCopy.unavailable)
    expect(details.shippingAddress).toBe(polishCopy.unavailable)
    expect(details.deliveryMethod).toBe(polishCopy.unavailable)
    expect(details.fulfillmentTime).toBe(polishCopy.deliveryTiming.courier.fulfillmentTime)
  })

  it("reads the checkout the session metadata points at", async () => {
    getCheckoutEmailContext.mockResolvedValue({
      billingAddress: null,
      billingAddressId: "adr-1",
      customerNote: null,
      deliveryMethod: { name: "Paczkomat InPost", type: "locker" },
      lockerId: "WAW01A",
      shippingAddress: {
        address1: "ul. Mokotowska 12/4",
        address2: null,
        city: "Warszawa",
        countryCode: "PL",
        firstName: "Anna",
        lastName: "Kowalska",
        phone: null,
        postalCode: "00-640",
      },
      shippingAddressId: "adr-1",
    })

    await dispatch(checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata })))

    const { details } = sentEmail().react.props

    expect(getCheckoutEmailContext).toHaveBeenCalledWith("chk-1")
    expect(details.deliveryMethod).toBe("Paczkomat InPost · WAW01A")
    expect(details.billingAddress).toBe(polishCopy.billingSameAsShipping)
    expect(details.shippingAddress).toBe("Anna Kowalska\nul. Mokotowska 12/4\n00-640 Warszawa\nPL")
    expect(details.estimatedDelivery).toBe(polishCopy.deliveryTiming.locker.estimatedDelivery)
  })

  it("invites a guest buyer to create an account and links a signed-in buyer to the order", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))
    const guestCta = sentEmail().react.props.accountCta
    vi.clearAllMocks()
    sendEmail.mockResolvedValue(undefined)
    fulfillCheckout.mockResolvedValue("order-1")
    getOrderTotalsForEmail.mockResolvedValue({
      discountTotal: 0,
      orderNumber: "MRT-2026-00042",
      shippingTotal: SHIPPING_TOTAL,
      subtotal: ITEMS_TOTAL,
      taxBasisPoints: 2300,
      taxTotal: 12_080,
      total: AMOUNT_TOTAL,
    })
    getCheckoutEmailContext.mockResolvedValue(undefined)

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, userId: "usr-1" })))

    expect(guestCta).toStrictEqual({
      href: "https://martebizuteria.pl/auth/sign-up",
      isGuest: true,
      label: polishCopy.createAccountCta,
    })
    expect(sentEmail().react.props.accountCta).toStrictEqual({
      href: "https://martebizuteria.pl/account/orders/order-1",
      isGuest: false,
      label: polishCopy.viewOrderCta,
    })
  })

  it("links every ordered item to its product page in the locale of the order", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(sentEmail().react.props.items).toStrictEqual([
      {
        imageUrl: "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/aurora.jpg",
        price: 24_900,
        productUrl: "https://martebizuteria.pl/en-US/products/bransoletka-aurora",
        qty: 2,
        title: "Bransoletka Aurora",
      },
    ])
  })
})

describe("order confirmation email delivery", () => {
  it("uses zero totals and the store defaults when Stripe omits optional session data", async () => {
    await dispatch(checkoutSessionCompletedEvent(checkoutSession({ currency: null, customerEmail: "anna@example.com" })))

    expect(fulfillCheckout).toHaveBeenCalledWith({
      currency: "PLN",
      lines: [],
      locale: "pl-PL",
      paidAmount: 0,
      transactionId: "cs_test_1",
    })
    expect(recordOrderPaymentCapturedAudit).toHaveBeenCalledWith("order-1", { detail: "0,00 PLN", resourceId: "order-1" })
    expect(getCheckoutEmailContext).not.toHaveBeenCalled()
  })

  it("treats empty metadata identifiers as a guest without looking up an empty checkout ID", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ checkoutId: "", items: itemsMetadata, userId: "" })))

    expect(getCheckoutEmailContext).not.toHaveBeenCalled()
    expect(sentEmail().react.props.accountCta.isGuest).toBe(true)
  })

  it("skips delivery when Stripe collected customer details without an email address", async () => {
    await dispatch(
      checkoutSessionCompletedEvent(
        checkoutSession({
          customerDetails: {
            address: null,
            business_name: null,
            email: null,
            individual_name: null,
            name: "Anna",
            phone: null,
            tax_exempt: null,
            tax_ids: null,
          },
        }),
      ),
    )

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("audits an unknown preparation failure without retrying a fulfilled order", async () => {
    getCheckoutEmailContext.mockRejectedValue({ code: "UNAVAILABLE" })
    const event = checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordEmailFailedAudit).toHaveBeenCalledWith("order-1", { detail: "Unknown error", resourceId: "order-1" })
  })

  it("falls back to the address collected by Stripe when the session carries no customer email", async () => {
    const session = checkoutSession({
      amountTotal: AMOUNT_TOTAL,
      customerDetails: {
        address: null,
        business_name: null,
        email: "collected@example.com",
        individual_name: null,
        name: null,
        phone: null,
        tax_exempt: null,
        tax_ids: null,
      },
      metadata: { items: itemsMetadata },
    })

    await dispatch(checkoutSessionCompletedEvent(session))

    expect(sentEmail().to).toBe("collected@example.com")
  })

  it("skips the email when the session holds no address at all", async () => {
    await dispatch(checkoutSessionCompletedEvent(checkoutSession({ amountTotal: AMOUNT_TOTAL, metadata: { items: itemsMetadata } })))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).not.toHaveBeenCalled()
  })

  it("hands the delivery failure Resend reports to the audit trail", async () => {
    sendEmail.mockResolvedValue("mailbox unavailable")

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "mailbox unavailable",
      label: "Order confirmation → anna@example.com",
      orderId: "order-1",
    })
  })

  it("records an email failure audit instead of failing the webhook when the email cannot be prepared", async () => {
    getCheckoutEmailContext.mockRejectedValue(new Error("D1_ERROR: no such table"))
    const event = checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordEmailFailedAudit).toHaveBeenCalledWith("order-1", {
      detail: "D1_ERROR: no such table",
      resourceId: "order-1",
    })
    expect(consoleError).toHaveBeenCalledWith("Order order-1 confirmation email could not be prepared:", expect.any(Error))
  })
})

describe("checkout session release", () => {
  it("releases the reserved stock of an expired session", async () => {
    await dispatch(checkoutSessionExpiredEvent(checkoutSession({ metadata: { items: itemsMetadata } })))

    expect(releaseCheckout).toHaveBeenCalledWith({
      lines: [
        {
          handle: "bransoletka-aurora",
          imageUrl: "products/aurora.jpg",
          price: 24_900,
          qty: 2,
          title: "Bransoletka Aurora",
          variantId: "var-aurora",
        },
      ],
      transactionId: "cs_test_1",
    })
    expect(recordOrderReleasedAudit).toHaveBeenCalledWith("cs_test_1", { resourceId: "cs_test_1" })
    expect(scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
  })

  it("releases the reserved stock when an asynchronous payment fails", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(checkoutSession({ metadata: { items: itemsMetadata } })))

    expect(releaseCheckout).toHaveBeenCalledOnce()
    expect(fulfillCheckout).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Checkout released after failed/expired session cs_test_1.")
  })

  it("releases nothing but still reports the release when the session has no items", async () => {
    await dispatch(checkoutSessionExpiredEvent(checkoutSession({})))

    expect(releaseCheckout).toHaveBeenCalledWith({ lines: [], transactionId: "cs_test_1" })
  })
})

const discountedSession = (overrides: Parameters<typeof checkoutSession>[0] = {}): Stripe.Checkout.Session =>
  checkoutSession({
    amountTotal: AMOUNT_TOTAL,
    discounts: [{ coupon: "coupon_spring", promotion_code: null }],
    metadata: { checkoutId: "chk-1", items: itemsMetadata },
    ...overrides,
  })

describe("checkout session discount coupon", () => {
  it("deletes the coupon it minted for the checkout once its session is paid and fulfilled", async () => {
    await dispatch(checkoutSessionCompletedEvent(discountedSession()))

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(couponsRetrieve).toHaveBeenCalledExactlyOnceWith("coupon_spring")
    expect(couponsDel).toHaveBeenCalledExactlyOnceWith("coupon_spring")
    expect(couponsDel).toHaveBeenCalledAfter(fulfillCheckout)
  })

  it("deletes the coupon of a completed session whose payment is still settling", async () => {
    await dispatch(checkoutSessionCompletedEvent(discountedSession({ paymentStatus: "unpaid" })))

    expect(fulfillCheckout).not.toHaveBeenCalled()
    expect(couponsDel).toHaveBeenCalledExactlyOnceWith("coupon_spring")
  })

  it("deletes the coupon of a session that expired or was replaced by a newer one, after releasing its stock", async () => {
    await dispatch(checkoutSessionExpiredEvent(discountedSession()))

    expect(releaseCheckout).toHaveBeenCalledOnce()
    expect(couponsDel).toHaveBeenCalledExactlyOnceWith("coupon_spring")
    expect(couponsDel).toHaveBeenCalledAfter(releaseCheckout)
  })

  it("leaves Stripe coupons alone for a session whose discounts are null, empty or missing", async () => {
    const withoutDiscounts = discountedSession()
    Reflect.deleteProperty(withoutDiscounts, "discounts")

    await dispatch(checkoutSessionCompletedEvent(discountedSession({ discounts: null })))
    await dispatch(checkoutSessionExpiredEvent(discountedSession({ discounts: [] })))
    await dispatch(checkoutSessionExpiredEvent(withoutDiscounts))

    expect(releaseCheckout).toHaveBeenCalledTimes(2)
    expect(couponsRetrieve).not.toHaveBeenCalled()
    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("leaves alone a coupon on the session that MARTE did not mint for this checkout", async () => {
    couponsRetrieve.mockResolvedValue({ id: "coupon_spring", metadata: {} })

    await dispatch(checkoutSessionExpiredEvent(discountedSession()))

    expect(releaseCheckout).toHaveBeenCalledOnce()
    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("leaves the settlement events to a coupon the completed event already deleted", async () => {
    await dispatch(checkoutSessionAsyncPaymentSucceededEvent(discountedSession()))
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(discountedSession()))

    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("keeps the coupon while fulfilment fails so the retried event can still delete it", async () => {
    fulfillCheckout.mockRejectedValue(new Error("D1 unavailable"))
    const event = checkoutSessionCompletedEvent(discountedSession())

    await expect(dispatch(event)).rejects.toThrow("D1 unavailable")
    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("acknowledges the event when the coupon is already gone", async () => {
    couponsRetrieve.mockRejectedValue(new Error("No such coupon: 'coupon_spring'"))
    const event = checkoutSessionExpiredEvent(discountedSession())

    await expect(dispatch(event)).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith("Failed to delete Stripe coupon coupon_spring:", expect.any(Error))
  })
})

describe("payment intent failure", () => {
  it("records the reason Stripe reported together with the checkout it belongs to", async () => {
    await dispatch(paymentIntentFailedEvent(paymentIntent({ checkoutId: "chk-1", failureMessage: "Your card was declined." })))

    expect(recordOrderPaymentFailedAudit).toHaveBeenCalledWith("pi_test_1", {
      detail: "Your card was declined.",
      resourceId: "pi_test_1",
    })
    expect(consoleWarn).toHaveBeenCalledWith("Payment failed for intent pi_test_1 (checkout chk-1): Your card was declined.")
  })

  it("records an unknown reason when Stripe reported no error", async () => {
    await dispatch(paymentIntentFailedEvent(paymentIntent({})))

    expect(recordOrderPaymentFailedAudit).toHaveBeenCalledWith("pi_test_1", { detail: "unknown", resourceId: "pi_test_1" })
    expect(consoleWarn).toHaveBeenCalledWith("Payment failed for intent pi_test_1 (checkout ?): unknown")
  })
})

describe("charge refunds", () => {
  it("resolves an expanded payment intent to the same checkout as its string reference", async () => {
    const expandedCharge = {
      ...charge({ amount: AMOUNT_TOTAL, amountRefunded: SHIPPING_TOTAL, paymentIntent: "pi_test_1" }),
      payment_intent: paymentIntent({}),
    }

    await dispatch(chargeRefundedEvent(expandedCharge))

    expect(sessionsList).toHaveBeenCalledWith({ limit: 1, payment_intent: "pi_test_1" })
    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: false,
      refundedAmount: SHIPPING_TOTAL,
      restock: true,
      transactionId: "cs_resolved_1",
    })
  })

  it("resolves the checkout session behind the refunded charge", async () => {
    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: "pi_test_1" })))

    expect(sessionsList).toHaveBeenCalledWith({ limit: 1, payment_intent: "pi_test_1" })
    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: true,
      refundedAmount: AMOUNT_TOTAL,
      restock: true,
      transactionId: "cs_resolved_1",
    })
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
    expect(scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
  })

  it("reports a partial refund as such", async () => {
    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: SHIPPING_TOTAL, paymentIntent: "pi_test_1" })))

    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: false,
      refundedAmount: SHIPPING_TOTAL,
      restock: true,
      transactionId: "cs_resolved_1",
    })
  })

  it("skips a charge that carries no payment intent", async () => {
    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: null })))

    expect(sessionsList).not.toHaveBeenCalled()
    expect(refundOrder).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Charge ch_test_1 refunded but no Checkout Session resolved; skipping.")
  })

  it("skips a charge whose payment intent matches no checkout session", async () => {
    sessionsList.mockResolvedValue({ data: [] })

    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: "pi_test_1" })))

    expect(refundOrder).not.toHaveBeenCalled()
    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
  })
})

describe("dispute opened", () => {
  it("freezes the order behind the disputed payment", async () => {
    await dispatch(
      chargeDisputeCreatedEvent(
        dispute({ amount: AMOUNT_TOTAL, paymentIntent: "pi_test_1", reason: "fraudulent", status: "needs_response" }),
      ),
    )

    expect(flagOrderDispute).toHaveBeenCalledWith("cs_resolved_1", {
      amount: AMOUNT_TOTAL,
      id: "dp_test_1",
      reason: "fraudulent",
      status: "needs_response",
    })
    expect(recordOrderDisputeOpenedAudit).toHaveBeenCalledWith("cs_resolved_1", {
      detail: "fraudulent — needs_response",
      resourceId: "cs_resolved_1",
    })
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
  })

  it("skips a dispute whose payment intent matches no checkout session", async () => {
    sessionsList.mockResolvedValue({ data: [] })

    await dispatch(chargeDisputeCreatedEvent(dispute({ amount: AMOUNT_TOTAL, paymentIntent: "pi_test_1", status: "needs_response" })))

    expect(flagOrderDispute).not.toHaveBeenCalled()
    expect(consoleWarn).toHaveBeenCalledWith("Dispute dp_test_1 created but no Checkout Session resolved; skipping.")
  })
})

describe("dispute closed", () => {
  it("refunds the order without restocking when the dispute is lost", async () => {
    await dispatch(chargeDisputeClosedEvent(dispute({ amount: AMOUNT_TOTAL, paymentIntent: "pi_test_1", status: "lost" })))

    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: true,
      refundedAmount: AMOUNT_TOTAL,
      restock: false,
      transactionId: "cs_resolved_1",
    })
    expect(clearOrderDispute).not.toHaveBeenCalled()
    expect(recordOrderDisputeClosedAudit).not.toHaveBeenCalled()
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
  })

  it("clears the dispute flag when the dispute is won", async () => {
    await dispatch(chargeDisputeClosedEvent(dispute({ amount: AMOUNT_TOTAL, paymentIntent: "pi_test_1", status: "won" })))

    expect(clearOrderDispute).toHaveBeenCalledWith("cs_resolved_1")
    expect(recordOrderDisputeClosedAudit).toHaveBeenCalledWith("cs_resolved_1", { detail: "won", resourceId: "cs_resolved_1" })
    expect(refundOrder).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Dispute dp_test_1 closed (won); dispute flag cleared.")
  })

  it("skips a closed dispute whose payment intent matches no checkout session", async () => {
    sessionsList.mockResolvedValue({ data: [] })

    await dispatch(chargeDisputeClosedEvent(dispute({ amount: AMOUNT_TOTAL, paymentIntent: "pi_test_1", status: "won" })))

    expect(clearOrderDispute).not.toHaveBeenCalled()
    expect(refundOrder).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Dispute dp_test_1 closed but no Checkout Session resolved; skipping.")
  })
})
