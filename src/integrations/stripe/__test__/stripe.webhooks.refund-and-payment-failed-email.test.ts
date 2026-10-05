import { type ComponentProps, type ReactElement } from "react"

import { render } from "react-email"
import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Order } from "~/src/modules/order/order.types"

type PaymentFailedElement = ReactElement<ComponentProps<typeof PaymentFailed>>

const { notifyOrderRefunded, recordOrderEmailOutcome, recordOrderReleasedAudit, refundOrder, releaseCheckout, sendEmail, sessionsList } =
  vi.hoisted(() => ({
    notifyOrderRefunded: vi.fn<(refund: Order["unannouncedRefund"], returnUrl: string | undefined) => Promise<boolean>>(),
    recordOrderEmailOutcome: vi.fn(),
    recordOrderReleasedAudit: vi.fn(),
    refundOrder: vi.fn<(input: Order["refundInput"]) => Promise<Order["unannouncedRefund"] | undefined>>(),
    releaseCheckout: vi.fn<(input: object) => Promise<boolean>>(),
    sendEmail: vi.fn<(options: Readonly<{ react: PaymentFailedElement; subject: string; to: string }>) => Promise<string | undefined>>(),
    sessionsList: vi.fn<(params: object) => Promise<{ data: Stripe.Checkout.Session[] }>>(),
  }))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { list: sessionsList } } } }))
vi.mock("~/src/integrations/stripe/stripe.coupons.server", () => ({ deleteCheckoutCoupons: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/resend/order-refunded.notification.server", () => ({ notifyOrderRefunded }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderEmailOutcome, recordOrderReleasedAudit }))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({ getFulfillmentTimeAttributesByVariantId: vi.fn() }))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutEmailContext: vi.fn() }))
vi.mock("~/src/modules/checkout/use-cases/fulfill-checkout.server", () => ({ fulfillCheckout: vi.fn() }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderTotalsForEmail: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/clear-order-dispute", () => ({ clearOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/flag-order-dispute", () => ({ flagOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/refund-order", () => ({ refundOrder }))

import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import {
  charge,
  chargeRefundedEvent,
  checkoutSession,
  checkoutSessionAsyncPaymentFailedEvent,
  checkoutSessionExpiredEvent,
} from "./fixtures/stripe-webhook-events"
import englishCopy from "~/messages/en-US/emails.payment-failed.json"
import polishCopy from "~/messages/pl-PL/emails.payment-failed.json"
import { PaymentFailed } from "~/src/presentation/emails/payment-failed"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

vi.spyOn(console, "info").mockImplementation(() => {})

const AMOUNT_TOTAL = 39_899

const RETURN_URL = "http://127.0.0.1:3000/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}"

const itemsMetadata = JSON.stringify([
  { handle: "onyx-necklace", imageUrl: "products/onyx.jpg", price: 37_900, qty: 1, title: "Onyx Necklace", variantId: "var-onyx" },
])

const PARTIAL_REFUND: Order["unannouncedRefund"] = { amount: 5000, fullyRefunded: false, orderId: "order-1" }

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`no webhook handler is registered for ${event.type}`)
  }

  await handler(event)
}

const failedSession = (overrides: Parameters<typeof checkoutSession>[0] = {}): Stripe.Checkout.Session =>
  checkoutSession({
    amountTotal: AMOUNT_TOTAL,
    customerEmail: "anna@example.com",
    metadata: { items: itemsMetadata, locale: "en-US" },
    paymentStatus: "unpaid",
    returnUrl: RETURN_URL,
    ...overrides,
  })

const sentEmail = () => {
  const [call] = sendEmail.mock.calls
  if (call === undefined) {
    throw new Error("no payment failure email was sent")
  }

  return call[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  releaseCheckout.mockResolvedValue(true)
  sendEmail.mockResolvedValue(undefined)
  refundOrder.mockResolvedValue(PARTIAL_REFUND)
  notifyOrderRefunded.mockResolvedValue(true)
  sessionsList.mockResolvedValue({ data: [checkoutSession({ id: "cs_resolved_1", returnUrl: RETURN_URL })] })
})

describe("failed asynchronous payment email", () => {
  it("tells the customer, in the language of the checkout, that the payment failed and the order was not placed", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession()))

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sentEmail().to).toBe("anna@example.com")
    expect(sentEmail().subject).toBe(englishCopy.subject)
    expect(sentEmail().react.type).toBe(PaymentFailed)
    expect(sentEmail().react.props).toMatchObject({ amount: AMOUNT_TOTAL, currency: "pln", locale: "en-US" })
  })

  it("lists the pieces and links them and the shop on the deployment the checkout returned to", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession()))

    const html = await render(sentEmail().react)

    expect(sentEmail().react.props.items).toMatchObject([
      { productUrl: "http://127.0.0.1:3000/en-US/products/onyx-necklace", qty: 1, title: "Onyx Necklace" },
    ])
    expect(html).toContain('href="http://127.0.0.1:3000/en-US/products"')
  })

  it("writes in the default locale when the checkout carried none", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession({ metadata: { items: itemsMetadata } })))

    expect(sentEmail().subject).toBe(polishCopy.subject)
  })

  it("writes to the address Stripe collected when the session was opened without one", async () => {
    const session = failedSession({
      customerDetails: {
        address: null,
        business_name: null,
        email: "jan@example.com",
        individual_name: null,
        name: null,
        phone: null,
        tax_exempt: null,
        tax_ids: null,
      },
      customerEmail: null,
    })

    await dispatch(checkoutSessionAsyncPaymentFailedEvent(session))

    expect(sentEmail().to).toBe("jan@example.com")
  })

  it("records the sent email against the session the release audit names", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession()))

    expect(recordOrderReleasedAudit).toHaveBeenCalledWith("cs_test_1", { resourceId: "cs_test_1" })
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: undefined,
      label: "Payment failed → anna@example.com",
      orderId: "cs_test_1",
    })
  })

  it("sends nothing when a redelivered event finds the session already released", async () => {
    releaseCheckout.mockResolvedValue(false)

    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession()))

    expect(releaseCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).not.toHaveBeenCalled()
  })

  it("sends nothing for a session that expired unpaid", async () => {
    await dispatch(checkoutSessionExpiredEvent(failedSession()))

    expect(releaseCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("records the refusal reported by the email transport", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    const event = checkoutSessionAsyncPaymentFailedEvent(failedSession())

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: DOMAIN_NOT_VERIFIED,
      label: "Payment failed → anna@example.com",
      orderId: "cs_test_1",
    })
  })

  it.each([
    ["has no return URL", { returnUrl: null }, "The Stripe session has no return URL to link the email to"],
    ["has no email address", { customerEmail: null }, "The Stripe session has no email address"],
    ["has an empty email address", { customerEmail: "" }, "The Stripe session has no email address"],
  ])("records why nothing was sent when the session %s", async (_case, overrides, failure) => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession(overrides)))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ failure, label: "Payment failed", orderId: "cs_test_1" })
  })

  it("records a session that returned to a host no deployment serves instead of throwing", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession({ returnUrl: "https://attacker.example/en-US/checkout" })))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("Payment failed for order cs_test_1 could not be prepared:", expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ failure: "FORBIDDEN", label: "Payment failed", orderId: "cs_test_1" })
  })
})

describe("refund email", () => {
  it("announces a refund the order had not announced, linked through the session's return URL", async () => {
    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: 5000, paymentIntent: "pi_test_1" })))

    expect(refundOrder).toHaveBeenCalledWith({ fullyRefunded: false, refundedAmount: 5000, restock: true, transactionId: "cs_resolved_1" })
    expect(notifyOrderRefunded).toHaveBeenCalledExactlyOnceWith(PARTIAL_REFUND, RETURN_URL)
  })

  it("sends nothing for a refund the cancellation or an earlier delivery already announced", async () => {
    refundOrder.mockResolvedValue(undefined)

    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: "pi_test_1" })))

    expect(refundOrder).toHaveBeenCalledOnce()
    expect(notifyOrderRefunded).not.toHaveBeenCalled()
  })
})
