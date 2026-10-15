import { type ComponentProps, type ReactElement } from "react"

import { render } from "react-email"
import type Stripe from "stripe"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Order } from "~/src/modules/order/order.types"

type PaymentFailedElement = ReactElement<ComponentProps<typeof PaymentFailed>>

const {
  recordOrderEmailOutcome,
  recordOrderReleasedAudit,
  refundOrder,
  refundsList,
  releaseCheckout,
  sendEmail,
  sendOrderRefundedEmail,
  sessionsList,
} = vi.hoisted(() => ({
  recordOrderEmailOutcome: vi.fn(),
  recordOrderReleasedAudit: vi.fn(),
  refundOrder: vi.fn<(input: Order["refundInput"]) => Promise<Order["unannouncedRefund"] | undefined>>(),
  refundsList: vi.fn<(params: object) => { autoPagingToArray: (options: object) => Promise<Stripe.Refund[]> }>(),
  releaseCheckout: vi.fn<(input: object) => Promise<boolean>>(),
  sendEmail:
    vi.fn<
      (
        options: Readonly<{ idempotencyKey?: string; react: PaymentFailedElement; subject: string; to: string }>,
      ) => Promise<string | undefined>
    >(),
  sendOrderRefundedEmail: vi.fn<(refund: Order["refundEmail"], returnUrl: string | undefined) => Promise<boolean>>(),
  sessionsList: vi.fn<(params: object) => Promise<{ data: Stripe.Checkout.Session[] }>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { checkout: { sessions: { list: sessionsList } }, refunds: { list: refundsList } },
}))
vi.mock("~/src/integrations/stripe/stripe.coupons.server", () => ({ deleteCheckoutCoupons: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/modules/order/use-cases/send-order-refunded-email.server", () => ({ sendOrderRefundedEmail }))
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
vi.mock("~/src/modules/order/use-cases/undo-failed-refund", () => ({ lowerRefundedAmount: vi.fn(), undoFailedRefund: vi.fn() }))

import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import {
  charge,
  chargeRefundedEvent,
  checkoutSession,
  checkoutSessionAsyncPaymentFailedEvent,
  checkoutSessionExpiredEvent,
  refund,
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

const PARTIAL_REFUND: Order["unannouncedRefund"] = { amount: 5000, fullyRefunded: false, orderId: "order-1", refundedTotal: 5000 }

const PAYMENT_FAILED_DELIVERY = { idempotencyKey: "payment-failed/cs_test_1", orderEmail: undefined }

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
  vi.useFakeTimers()
  releaseCheckout.mockResolvedValue(true)
  sendEmail.mockResolvedValue(undefined)
  refundOrder.mockResolvedValue(PARTIAL_REFUND)
  sendOrderRefundedEmail.mockResolvedValue(true)
  refundsList.mockReturnValue({
    autoPagingToArray: () =>
      Promise.resolve([
        refund({ amount: 3000, id: "re_newest", status: "pending" }),
        refund({ amount: 2000, id: "re_older", status: "succeeded" }),
      ]),
  })
  sessionsList.mockResolvedValue({ data: [checkoutSession({ id: "cs_resolved_1", returnUrl: RETURN_URL })] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("failed asynchronous payment email", () => {
  it("tells the customer, in the language of the checkout, that the payment failed and the order was not placed", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession()))

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sentEmail().to).toBe("anna@example.com")
    expect(sentEmail().idempotencyKey).toBe("payment-failed/cs_test_1")
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
      metadata: PAYMENT_FAILED_DELIVERY,
      orderId: "cs_test_1",
      willRetry: false,
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
      metadata: PAYMENT_FAILED_DELIVERY,
      orderId: "cs_test_1",
      willRetry: true,
    })
  })

  it("tries a refused payment failure email again under the same idempotency key", async () => {
    sendEmail.mockResolvedValueOnce(DOMAIN_NOT_VERIFIED)

    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession()))
    await vi.runAllTimersAsync()

    expect(releaseCheckout).toHaveBeenCalledOnce()
    expect(sendEmail.mock.calls.map(([options]) => options.idempotencyKey)).toStrictEqual([
      "payment-failed/cs_test_1",
      "payment-failed/cs_test_1",
    ])
    expect(recordOrderEmailOutcome).toHaveBeenLastCalledWith(expect.objectContaining({ failure: undefined, willRetry: false }))
  })

  it.each([
    ["has no return URL", { returnUrl: null }, "The Stripe session has no return URL to link the email to"],
    ["has no email address", { customerEmail: null }, "The Stripe session has no email address"],
    ["has an empty email address", { customerEmail: "" }, "The Stripe session has no email address"],
  ])("records why nothing was sent when the session %s", async (_case, overrides, failure) => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession(overrides)))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure,
      label: "Payment failed",
      metadata: PAYMENT_FAILED_DELIVERY,
      orderId: "cs_test_1",
      willRetry: true,
    })
  })

  it("records a session that returned to a host no deployment serves instead of throwing", async () => {
    await dispatch(checkoutSessionAsyncPaymentFailedEvent(failedSession({ returnUrl: "https://attacker.example/en-US/checkout" })))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("Payment failed for order cs_test_1 could not be prepared:", expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      failure: "FORBIDDEN",
      label: "Payment failed",
      metadata: PAYMENT_FAILED_DELIVERY,
      orderId: "cs_test_1",
      willRetry: true,
    })
  })
})

describe("refund email", () => {
  it("announces a refund the order had not announced under the newest Stripe refund, linked through the session's return URL", async () => {
    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: 5000, paymentIntent: "pi_test_1" })))

    expect(refundOrder).toHaveBeenCalledWith({ fullyRefunded: false, refundedAmount: 5000, transactionId: "cs_resolved_1" })
    expect(sendOrderRefundedEmail).toHaveBeenCalledExactlyOnceWith({ ...PARTIAL_REFUND, refundId: "re_newest" }, RETURN_URL)
  })

  it("sends nothing for a refund the cancellation or an earlier delivery already announced", async () => {
    refundOrder.mockResolvedValue(undefined)

    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: "pi_test_1" })))

    expect(refundOrder).toHaveBeenCalledOnce()
    expect(sendOrderRefundedEmail).not.toHaveBeenCalled()
  })
})
