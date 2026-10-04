import { type ComponentProps, type ReactElement } from "react"

import type Stripe from "stripe"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

type OrderConfirmationElement = ReactElement<ComponentProps<typeof OrderConfirmation>>

const {
  fulfillCheckout,
  getCheckoutEmailContext,
  getOrderTotalsForEmail,
  paymentIntentsRetrieve,
  recordOrderEmailOutcome,
  recordOrderPaymentCapturedAudit,
  sendEmail,
} = vi.hoisted(() => ({
  fulfillCheckout: vi.fn<(input: object) => Promise<string | undefined>>(),
  getCheckoutEmailContext: vi.fn<(checkoutId: string) => Promise<object | undefined>>(),
  getOrderTotalsForEmail: vi.fn<(orderId: string) => Promise<Record<string, unknown> | undefined>>(),
  paymentIntentsRetrieve: vi.fn<(id: string, params: object) => Promise<{ payment_method: { type: string } | null }>>(),
  recordOrderEmailOutcome: vi.fn(),
  recordOrderPaymentCapturedAudit: vi.fn(),
  sendEmail: vi.fn<(options: Readonly<{ react: OrderConfirmationElement; subject: string; to: string }>) => Promise<string | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: paymentIntentsRetrieve } } }))
vi.mock("~/src/integrations/stripe/stripe.coupons.server", () => ({ deleteCheckoutCoupons: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderDisputeClosedAudit: vi.fn(),
  recordOrderDisputeOpenedAudit: vi.fn(),
  recordOrderEmailOutcome,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit: vi.fn(),
  recordOrderPlacedAudit: vi.fn(),
  recordOrderReleasedAudit: vi.fn(),
}))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutEmailContext }))
vi.mock("~/src/modules/checkout/use-cases/fulfill-checkout.server", () => ({ fulfillCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: vi.fn() }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderTotalsForEmail }))
vi.mock("~/src/modules/order/use-cases/clear-order-dispute", () => ({ clearOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/flag-order-dispute", () => ({ flagOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/refund-order", () => ({ refundOrder: vi.fn() }))

import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { executionContextStorage } from "~/src/lib/background"

import { checkoutSession, checkoutSessionCompletedEvent } from "./fixtures/stripe-webhook-events"
import englishCopy from "~/messages/en-US/emails.order-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.order-confirmation.json"
import { OrderConfirmation } from "~/src/presentation/emails/order-confirmation"

vi.spyOn(console, "error").mockImplementation(() => {})

vi.spyOn(console, "info").mockImplementation(() => {})

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

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const paidSession = (metadata: Stripe.Metadata, email: string | null = "anna@example.com"): Stripe.Checkout.Session =>
  checkoutSession({ amountTotal: AMOUNT_TOTAL, customerEmail: email, metadata, paymentIntent: "pi_test_1" })

const itemsMetadata = JSON.stringify(fulfillmentLines)

const UNSENT_CONFIRMATION = { label: "Order confirmation", orderId: "order-1" }

const sessionCheckedOutOn = (origin: string, metadata: Stripe.Metadata): Stripe.Checkout.Session =>
  checkoutSession({
    amountTotal: AMOUNT_TOTAL,
    customerEmail: "anna@example.com",
    metadata,
    paymentIntent: "pi_test_1",
    returnUrl: `${origin}/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
  })

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
  sendEmail.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
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

  it("reports a zero total when neither the order row nor the session carries one", async () => {
    getOrderTotalsForEmail.mockResolvedValue(undefined)
    await dispatch(
      checkoutSessionCompletedEvent(checkoutSession({ customerEmail: "anna@example.com", metadata: { items: itemsMetadata } })),
    )

    expect(sentEmail().react.props.total).toBe(0)
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
      href: "http://127.0.0.1:3000/auth/sign-up",
      isGuest: true,
      label: polishCopy.createAccountCta,
    })
    expect(sentEmail().react.props.accountCta).toStrictEqual({
      href: "http://127.0.0.1:3000/account/orders/order-1",
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
        productUrl: "http://127.0.0.1:3000/en-US/products/bransoletka-aurora",
        qty: 2,
        title: "Bransoletka Aurora",
      },
    ])
  })
})

describe("order confirmation email links", () => {
  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://preview.martebizuteria.pl",
    "https://martebizuteria-preview.pjborowiecki.workers.dev",
    "https://martebizuteria.pl",
    "https://martebizuteria.pjborowiecki.workers.dev",
  ])("links an order checked out on %s back to that address", async (origin) => {
    await dispatch(checkoutSessionCompletedEvent(sessionCheckedOutOn(origin, { items: itemsMetadata, locale: "en-US" })))

    expect(sentEmail().react.props.accountCta.href).toBe(`${origin}/en-US/auth/sign-up`)
    expect(sentEmail().react.props.items[0]?.productUrl).toBe(`${origin}/en-US/products/bransoletka-aurora`)
  })

  it.each(["preview", "production"])(
    "links a checkout made on 127.0.0.1 back to 127.0.0.1 when the %s deployment's webhook fulfils it",
    async (mode) => {
      vi.stubEnv("MODE", mode)

      await dispatch(checkoutSessionCompletedEvent(sessionCheckedOutOn("http://127.0.0.1:3000", { items: itemsMetadata, userId: "usr-1" })))

      expect(sentEmail().react.props.accountCta.href).toBe("http://127.0.0.1:3000/account/orders/order-1")
      expect(sentEmail().react.props.items[0]?.productUrl).toBe("http://127.0.0.1:3000/products/bransoletka-aurora")
    },
  )

  it.each([
    "https://martebizuteria.pl.attacker.example",
    "https://fakemartebizuteria.pl",
    "https://other.pjborowiecki.workers.dev",
    "http://martebizuteria.pl",
    "http://localhost:3001",
    "http://[::1]:3000",
  ])("still fulfils an order whose session returns to %s, and records the confirmation as unsent", async (origin) => {
    const event = checkoutSessionCompletedEvent(sessionCheckedOutOn(origin, { items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({ ...UNSENT_CONFIRMATION, failure: "FORBIDDEN" })
  })

  it("still fulfils an order whose session has no return URL, and records why the confirmation was not sent", async () => {
    const session = checkoutSession({
      amountTotal: AMOUNT_TOTAL,
      customerEmail: "anna@example.com",
      metadata: { items: itemsMetadata },
      paymentIntent: "pi_test_1",
      returnUrl: null,
    })

    await expect(dispatch(checkoutSessionCompletedEvent(session))).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      ...UNSENT_CONFIRMATION,
      failure: "The Stripe session has no return URL to link the email to",
    })
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

  it("records the missing recipient when Stripe collected customer details without an email address", async () => {
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
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_CONFIRMATION, failure: "The Stripe session has no email address" })
  })

  it("audits a preparation failure that is not an error without retrying a fulfilled order", async () => {
    getCheckoutEmailContext.mockRejectedValue("D1 is unavailable")
    const event = checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_CONFIRMATION, failure: "D1 is unavailable" })
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

  it("records an order confirmation that has no recipient against the order", async () => {
    await dispatch(checkoutSessionCompletedEvent(checkoutSession({ amountTotal: AMOUNT_TOTAL, metadata: { items: itemsMetadata } })))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_CONFIRMATION, failure: "The Stripe session has no email address" })
  })

  it("records a confirmation that could not be prepared against the order instead of failing the webhook", async () => {
    getCheckoutEmailContext.mockRejectedValue(new Error("D1_ERROR: no such table"))
    const event = checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_CONFIRMATION, failure: "D1_ERROR: no such table" })
  })

  it("hands the refusal Resend reports to the audit trail and keeps the webhook successful", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order confirmation → anna@example.com",
      orderId: "order-1",
    })
  })

  it("keeps the confirmation email running for the Worker when Stripe stops waiting for the answer", async () => {
    const kept: Promise<unknown>[] = []
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }))

    await executionContextStorage.run(
      {
        waitUntil: (task) => {
          kept.push(task)
        },
      },
      () => dispatch(event),
    )
    await Promise.all(kept)

    expect(kept).toHaveLength(1)
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: undefined,
      label: "Order confirmation → anna@example.com",
      orderId: "order-1",
    })
  })
})
