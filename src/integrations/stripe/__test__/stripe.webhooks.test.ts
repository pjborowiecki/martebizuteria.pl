import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const {
  clearOrderDispute,
  couponsDel,
  couponsRetrieve,
  flagOrderDispute,
  fulfillCheckout,
  getCheckoutEmailContext,
  getOrderTotalsForEmail,
  paymentIntentsRetrieve,
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderEmailOutcome,
  recordOrderFulfillmentFailedAudit,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderReleasedAudit,
  refundOrder,
  refundsList,
  releaseCheckout,
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
  sendEmail,
  sendIncidentAlert,
  sendNewOrderEmail,
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
  recordOrderDisputeClosedAudit: vi.fn(),
  recordOrderDisputeOpenedAudit: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  recordOrderFulfillmentFailedAudit: vi.fn<(sessionId: string, options: { detail: string }) => void>(),
  recordOrderPaymentCapturedAudit: vi.fn(),
  recordOrderPaymentFailedAudit: vi.fn(),
  recordOrderReleasedAudit: vi.fn(),
  refundOrder: vi.fn<(input: object) => Promise<void>>(),
  refundsList: vi.fn<(params: object) => { autoPagingToArray: (options: object) => Promise<Stripe.Refund[]> }>(),
  releaseCheckout: vi.fn<(input: object) => Promise<boolean>>(),
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: vi.fn(),
  sendEmail: vi.fn<(options: Readonly<{ subject: string; to: string }>) => Promise<string | undefined>>(),
  sendIncidentAlert: vi.fn<(incident: { detail: string; kind: string; reference: string }) => Promise<void>>(),
  sendNewOrderEmail: vi.fn<(orderId: string, returnUrl: string | undefined) => Promise<void>>(),
  sessionsList: vi.fn<(params: object) => Promise<{ data: { id: string }[] }>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: {
    checkout: { sessions: { list: sessionsList } },
    coupons: { del: couponsDel, retrieve: couponsRetrieve },
    paymentIntents: { retrieve: paymentIntentsRetrieve },
    refunds: { list: refundsList },
  },
}))
vi.mock("~/src/lib/incident-alert.server", () => ({ sendIncidentAlert }))
vi.mock("~/src/modules/order/use-cases/send-new-order-email.server", () => ({ sendNewOrderEmail }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/modules/order-withdrawal/use-cases/load-withdrawal-form-attachment.server", () => ({
  loadWithdrawalFormAttachment: vi.fn(() => Promise.resolve({ content: "JVBERi0=", filename: "formularz_zwrotu.pdf" })),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderEmailOutcome,
  recordOrderFulfillmentFailedAudit,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderReleasedAudit,
}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({
  getFulfillmentTimeAttributesByVariantId: vi.fn(() => Promise.resolve(new Map())),
}))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutEmailContext }))
vi.mock("~/src/modules/checkout/use-cases/fulfill-checkout.server", () => ({ fulfillCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderTotalsForEmail }))
vi.mock("~/src/modules/order/use-cases/clear-order-dispute.server", () => ({ clearOrderDispute }))
vi.mock("~/src/modules/order/use-cases/flag-order-dispute.server", () => ({ flagOrderDispute }))
vi.mock("~/src/modules/order/use-cases/refund-order.server", () => ({ refundOrder }))
vi.mock("~/src/modules/order/use-cases/undo-failed-refund.server", () => ({ lowerRefundedAmount: vi.fn(), undoFailedRefund: vi.fn() }))
const { getHeldLinesByTransactionId } = vi.hoisted(() => ({
  getHeldLinesByTransactionId: vi.fn<(transactionId: string) => Promise<{ qty: number; variantId: string }[]>>(),
}))

vi.mock("~/src/modules/payment/payment.accessors", () => ({ getHeldLinesByTransactionId }))
vi.mock("~/src/modules/checkout/checkout.session-lines.server", async () => {
  const { parseCheckoutSessionFulfillmentLines } = await import("~/src/modules/checkout/checkout-metadata.zod")

  return {
    readCheckoutSessionLines: (session: Parameters<typeof parseCheckoutSessionFulfillmentLines>[0]) =>
      Promise.resolve(parseCheckoutSessionFulfillmentLines(session)),
  }
})

import { STRIPE_WEBHOOK_EVENTS } from "~/src/integrations/stripe/stripe.constants"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

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
  refund,
} from "./fixtures/stripe-webhook-events"

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

const stripeRefunds = (refunds: readonly Stripe.Refund[]) => ({ autoPagingToArray: () => Promise.resolve([...refunds]) })

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`no webhook handler is registered for ${event.type}`)
  }

  await handler(event)
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
  releaseCheckout.mockResolvedValue(true)
  getHeldLinesByTransactionId.mockResolvedValue([])
  refundOrder.mockResolvedValue(undefined)
  refundsList.mockReturnValue(stripeRefunds([refund({ amount: AMOUNT_TOTAL, status: "succeeded" })]))
  flagOrderDispute.mockResolvedValue(undefined)
  clearOrderDispute.mockResolvedValue(undefined)
  sendEmail.mockResolvedValue(undefined)
  sendNewOrderEmail.mockResolvedValue(undefined)
  sendIncidentAlert.mockResolvedValue(undefined)
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
    expect(recordOrderFulfillmentFailedAudit).toHaveBeenCalledOnce()
    expect(recordOrderFulfillmentFailedAudit.mock.calls[0]?.[1].detail).toMatch(/^548,00 PLN — anna@example\.com — /u)
  })

  it("records the captured payment and refreshes the admin and catalog caches", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(recordOrderPaymentCapturedAudit).toHaveBeenCalledWith("order-1", { detail: "548,00 PLN", resourceId: "order-1" })
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
    expect(scheduleProductCatalogInvalidation).toHaveBeenCalledOnce()
  })

  it("formats the captured amount for the locale the checkout was made in", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(recordOrderPaymentCapturedAudit).toHaveBeenCalledWith("order-1", { detail: "548.00 PLN", resourceId: "order-1" })
  })

  it("stops when another delivery already turned the session into an order", async () => {
    fulfillCheckout.mockResolvedValue(undefined)

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(recordOrderPaymentCapturedAudit).not.toHaveBeenCalled()
    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendNewOrderEmail).not.toHaveBeenCalled()
  })

  it("fulfills a session whose asynchronous payment succeeded", async () => {
    await dispatch(checkoutSessionAsyncPaymentSucceededEvent(paidSession({ items: itemsMetadata })))

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(releaseCheckout).not.toHaveBeenCalled()
    expect(sendNewOrderEmail).toHaveBeenCalledExactlyOnceWith(
      "order-1",
      "http://127.0.0.1:3000/checkout?success=true&session_id={CHECKOUT_SESSION_ID}",
    )
  })
})

describe("a paid checkout session that creates no order", () => {
  it("records the paid session it could not turn into an order as an error and lets Stripe retry it", async () => {
    fulfillCheckout.mockRejectedValue(new Error("D1_ERROR: FOREIGN KEY constraint failed"))
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }))

    await expect(dispatch(event)).rejects.toThrow("FOREIGN KEY")

    expect(recordOrderFulfillmentFailedAudit).toHaveBeenCalledExactlyOnceWith("cs_test_1", {
      detail: "548,00 PLN — anna@example.com — D1_ERROR: FOREIGN KEY constraint failed",
    })
    expect(consoleError).toHaveBeenCalledWith("Paid Checkout Session cs_test_1 created no order:", expect.any(Error))
    expect(recordOrderPaymentCapturedAudit).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendNewOrderEmail).not.toHaveBeenCalled()
    expect(sendIncidentAlert).not.toHaveBeenCalled()
  })

  it("records a paid session that matches no open checkout and acknowledges it, since a retry cannot help", async () => {
    fulfillCheckout.mockRejectedValue(new AppError(ERROR_CODES.NOT_FOUND, "No payment carries Checkout Session cs_test_1"))
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }, null))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(recordOrderFulfillmentFailedAudit).toHaveBeenCalledExactlyOnceWith("cs_test_1", {
      detail: "548,00 PLN — No payment carries Checkout Session cs_test_1",
    })
    expect(sendIncidentAlert).toHaveBeenCalledExactlyOnceWith({
      detail: "548,00 PLN — No payment carries Checkout Session cs_test_1",
      kind: "paidCheckoutWithoutOrder",
      reference: "cs_test_1",
    })
    expect(recordOrderPaymentCapturedAudit).not.toHaveBeenCalled()
    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    expect(sendNewOrderEmail).not.toHaveBeenCalled()
  })

  it("names the address Stripe collected and the bare cause when the session has no amount", async () => {
    fulfillCheckout.mockRejectedValue("D1 unavailable")
    const session = checkoutSession({
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
      metadata: { items: itemsMetadata },
    })

    await expect(dispatch(checkoutSessionAsyncPaymentSucceededEvent(session))).rejects.toBe("D1 unavailable")

    expect(recordOrderFulfillmentFailedAudit).toHaveBeenCalledExactlyOnceWith("cs_test_1", { detail: "jan@example.com — D1 unavailable" })
  })
})

describe("checkout session release", () => {
  it("releases the stock the expired session's payment holds", async () => {
    getHeldLinesByTransactionId.mockResolvedValue([{ qty: 2, variantId: "var-aurora" }])

    await dispatch(checkoutSessionExpiredEvent(checkoutSession({ metadata: { checkoutId: "checkout-1" } })))

    expect(getHeldLinesByTransactionId).toHaveBeenCalledExactlyOnceWith("cs_test_1")
    expect(releaseCheckout).toHaveBeenCalledWith({ lines: [{ qty: 2, variantId: "var-aurora" }], transactionId: "cs_test_1" })
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

  it("releases nothing but still reports the release when the session's payment holds nothing", async () => {
    await dispatch(checkoutSessionExpiredEvent(checkoutSession({})))

    expect(releaseCheckout).toHaveBeenCalledWith({ lines: [], transactionId: "cs_test_1" })
  })

  it("records no release for a session whose checkout moved to a newer session before it expired", async () => {
    releaseCheckout.mockResolvedValue(false)

    await dispatch(checkoutSessionExpiredEvent(checkoutSession({ metadata: { items: itemsMetadata } })))

    expect(releaseCheckout).toHaveBeenCalledOnce()
    expect(recordOrderReleasedAudit).not.toHaveBeenCalled()
    expect(scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith(
      "Session cs_test_1 held nothing to release: its checkout was paid, released or moved to a newer session.",
    )
  })

  it("records no release when a redelivered payment failure finds the session already released", async () => {
    releaseCheckout.mockResolvedValue(false)

    await dispatch(checkoutSessionAsyncPaymentFailedEvent(checkoutSession({ metadata: { items: itemsMetadata } })))

    expect(recordOrderReleasedAudit).not.toHaveBeenCalled()
    expect(scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
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
    refundsList.mockReturnValue(stripeRefunds([refund({ amount: SHIPPING_TOTAL, status: "succeeded" })]))
    const expandedCharge = {
      ...charge({ amount: AMOUNT_TOTAL, amountRefunded: SHIPPING_TOTAL, paymentIntent: "pi_test_1" }),
      payment_intent: paymentIntent({}),
    }

    await dispatch(chargeRefundedEvent(expandedCharge))

    expect(sessionsList).toHaveBeenCalledWith({ limit: 1, payment_intent: "pi_test_1" })
    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: false,
      refundedAmount: SHIPPING_TOTAL,
      transactionId: "cs_resolved_1",
    })
  })

  it("resolves the checkout session behind the refunded charge and records the refund without touching stock", async () => {
    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: "pi_test_1" })))

    expect(sessionsList).toHaveBeenCalledWith({ limit: 1, payment_intent: "pi_test_1" })
    expect(refundsList.mock.calls).toStrictEqual([[{ charge: "ch_test_1", limit: 100 }], [{ charge: "ch_test_1", limit: 100 }]])
    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: true,
      refundedAmount: AMOUNT_TOTAL,
      transactionId: "cs_resolved_1",
    })
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
    expect(scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
  })

  it("reports a partial refund as such", async () => {
    refundsList.mockReturnValue(stripeRefunds([refund({ amount: SHIPPING_TOTAL, status: "succeeded" })]))

    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: SHIPPING_TOTAL, paymentIntent: "pi_test_1" })))

    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: false,
      refundedAmount: SHIPPING_TOTAL,
      transactionId: "cs_resolved_1",
    })
  })

  it("records only the refunds Stripe has not failed or cancelled by the time the event is handled", async () => {
    refundsList.mockReturnValue(
      stripeRefunds([
        refund({ amount: AMOUNT_TOTAL - SHIPPING_TOTAL, id: "re_failed", status: "failed" }),
        refund({ amount: 1000, id: "re_pending", status: "pending" }),
        refund({ amount: 500, id: "re_cancelled", status: "canceled" }),
        refund({ amount: SHIPPING_TOTAL, id: "re_shipping", status: "succeeded" }),
      ]),
    )

    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: "pi_test_1" })))

    expect(refundOrder).toHaveBeenCalledExactlyOnceWith({
      fullyRefunded: false,
      refundedAmount: SHIPPING_TOTAL + 1000,
      transactionId: "cs_resolved_1",
    })
  })

  it("records nothing when every refund on the charge failed or was cancelled before the event was handled", async () => {
    refundsList.mockReturnValue(stripeRefunds([refund({ amount: AMOUNT_TOTAL, status: "failed" })]))

    await dispatch(chargeRefundedEvent(charge({ amount: AMOUNT_TOTAL, amountRefunded: AMOUNT_TOTAL, paymentIntent: "pi_test_1" })))

    expect(refundOrder).not.toHaveBeenCalled()
    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Charge ch_test_1 has no refund that still stands; nothing to record.")
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
  it("refunds the order, leaving its stock alone, when the dispute is lost", async () => {
    await dispatch(chargeDisputeClosedEvent(dispute({ amount: AMOUNT_TOTAL, paymentIntent: "pi_test_1", status: "lost" })))

    expect(refundOrder).toHaveBeenCalledWith({
      fullyRefunded: true,
      refundedAmount: AMOUNT_TOTAL,
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
