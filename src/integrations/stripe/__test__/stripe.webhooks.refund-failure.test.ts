import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Order } from "~/src/modules/order/order.types"

const {
  refundOrder,
  refundsList,
  scheduleAdminOrdersInvalidation,
  sendIncidentAlert,
  sendOrderRefundedEmail,
  sessionsList,
  undoFailedRefund,
} = vi.hoisted(() => ({
  refundOrder: vi.fn(),
  refundsList: vi.fn<(params: object) => { autoPagingToArray: (options: object) => Promise<Stripe.Refund[]> }>(),
  scheduleAdminOrdersInvalidation: vi.fn(),
  sendIncidentAlert: vi.fn<(incident: { detail: string; kind: string; reference: string }) => Promise<void>>(),
  sendOrderRefundedEmail: vi.fn(),
  sessionsList: vi.fn<(params: object) => Promise<{ data: Stripe.Checkout.Session[] }>>(),
  undoFailedRefund: vi.fn<(input: Order["failedRefundInput"]) => Promise<Order["failedRefund"] | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { checkout: { sessions: { list: sessionsList } }, refunds: { list: refundsList } },
}))
vi.mock("~/src/integrations/stripe/stripe.coupons.server", () => ({ deleteCheckoutCoupons: vi.fn() }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: vi.fn() }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/lib/incident-alert.server", () => ({ sendIncidentAlert }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.accessors", () => ({ getFulfillmentTimeAttributesByVariantId: vi.fn() }))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutEmailContext: vi.fn() }))
vi.mock("~/src/modules/checkout/use-cases/fulfill-checkout.server", () => ({ fulfillCheckout: vi.fn() }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: vi.fn() }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderTotalsForEmail: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/clear-order-dispute.server", () => ({ clearOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/flag-order-dispute.server", () => ({ flagOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/refund-order.server", () => ({ refundOrder }))
vi.mock("~/src/modules/order/use-cases/send-order-refunded-email.server", () => ({ sendOrderRefundedEmail }))
vi.mock("~/src/modules/order/use-cases/undo-failed-refund.server", () => ({ undoFailedRefund }))

import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { checkoutSession, refund, refundFailedEvent, refundUpdatedEvent } from "./fixtures/stripe-webhook-events"

const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})

const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

const AMOUNT_TOTAL = 54_800

const SHIPPING_TOTAL = 5000

const ORDER = { orderId: "order-1", orderNumber: "MRT-2026-00042" }

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`no webhook handler is registered for ${event.type}`)
  }

  await handler(event)
}

const stripeRefunds = (refunds: readonly Stripe.Refund[]) => ({ autoPagingToArray: () => Promise.resolve([...refunds]) })

const failedFullRefund = refund({ amount: AMOUNT_TOTAL, failureReason: "expired_or_canceled_card", status: "failed" })

beforeEach(() => {
  vi.clearAllMocks()
  sessionsList.mockResolvedValue({ data: [checkoutSession({ id: "cs_resolved_1", paymentIntent: "pi_test_1" })] })
  refundsList.mockReturnValue(stripeRefunds([failedFullRefund]))
  undoFailedRefund.mockResolvedValue(ORDER)
  sendIncidentAlert.mockResolvedValue(undefined)
})

describe("a refund Stripe could not complete", () => {
  it("takes the failed refund off its order with what the charge's other refunds still add up to", async () => {
    await dispatch(refundFailedEvent(failedFullRefund))

    expect(sessionsList).toHaveBeenCalledExactlyOnceWith({ limit: 1, payment_intent: "pi_test_1" })
    expect(refundsList).toHaveBeenCalledExactlyOnceWith({ charge: "ch_test_1", limit: 100 })
    expect(undoFailedRefund).toHaveBeenCalledExactlyOnceWith({
      refund: { amount: AMOUNT_TOTAL, failureReason: "expired_or_canceled_card", id: "re_test_1", status: "failed" },
      refundedAmount: 0,
      transactionId: "cs_resolved_1",
    })
    expect(scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
  })

  it("alerts the shop with the order, the amount and Stripe's reason, and emails the customer nothing", async () => {
    await dispatch(refundFailedEvent(failedFullRefund))

    expect(sendIncidentAlert).toHaveBeenCalledExactlyOnceWith({
      detail: "MRT-2026-00042 — 548,00 PLN — failed — expired_or_canceled_card",
      kind: "refundFailed",
      reference: "re_test_1",
    })
    expect(consoleWarn).toHaveBeenCalledWith(
      "Refund re_test_1 did not reach the customer; the shop was alerted: MRT-2026-00042 — 548,00 PLN — failed — expired_or_canceled_card",
    )
    expect(sendOrderRefundedEmail).not.toHaveBeenCalled()
    expect(refundOrder).not.toHaveBeenCalled()
  })

  it("handles a refund cancelled in the Stripe dashboard, reported by refund.updated, the same way", async () => {
    const cancelled = refund({
      amount: AMOUNT_TOTAL - SHIPPING_TOTAL,
      failureReason: "merchant_request",
      id: "re_rest",
      status: "canceled",
    })
    refundsList.mockReturnValue(stripeRefunds([cancelled, refund({ amount: SHIPPING_TOTAL, id: "re_shipping", status: "succeeded" })]))

    await dispatch(refundUpdatedEvent(cancelled))

    expect(undoFailedRefund).toHaveBeenCalledExactlyOnceWith({
      refund: { amount: AMOUNT_TOTAL - SHIPPING_TOTAL, failureReason: "merchant_request", id: "re_rest", status: "canceled" },
      refundedAmount: SHIPPING_TOTAL,
      transactionId: "cs_resolved_1",
    })
    expect(sendIncidentAlert).toHaveBeenCalledExactlyOnceWith({
      detail: "MRT-2026-00042 — 498,00 PLN — canceled — merchant_request",
      kind: "refundFailed",
      reference: "re_rest",
    })
  })

  it("names no reason in the alert when Stripe gives none", async () => {
    const failed = refund({ amount: SHIPPING_TOTAL, status: "failed" })

    await dispatch(refundFailedEvent(failed))

    expect(undoFailedRefund.mock.lastCall?.[0].refund.failureReason).toBeUndefined()
    expect(sendIncidentAlert).toHaveBeenCalledWith(expect.objectContaining({ detail: "MRT-2026-00042 — 50,00 PLN — failed" }))
  })

  it.each([["succeeded"], ["pending"], ["requires_action"], [null]])(
    "leaves the order alone when a refund update leaves the refund %s",
    async (status) => {
      await dispatch(refundUpdatedEvent(refund({ amount: AMOUNT_TOTAL, status })))

      expect(sessionsList).not.toHaveBeenCalled()
      expect(refundsList).not.toHaveBeenCalled()
      expect(undoFailedRefund).not.toHaveBeenCalled()
      expect(sendIncidentAlert).not.toHaveBeenCalled()
    },
  )

  it("skips a failed refund whose payment matches no Checkout Session", async () => {
    sessionsList.mockResolvedValue({ data: [] })

    await dispatch(refundFailedEvent(failedFullRefund))

    expect(undoFailedRefund).not.toHaveBeenCalled()
    expect(sendIncidentAlert).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Refund re_test_1 failed but no Checkout Session resolved; skipping.")
  })

  it("skips a failed refund that carries no charge", async () => {
    await dispatch(refundFailedEvent(refund({ amount: AMOUNT_TOTAL, charge: null, status: "failed" })))

    expect(refundsList).not.toHaveBeenCalled()
    expect(undoFailedRefund).not.toHaveBeenCalled()
  })

  it("skips a failed refund that carries no payment intent", async () => {
    await dispatch(refundFailedEvent(refund({ amount: AMOUNT_TOTAL, paymentIntent: null, status: "failed" })))

    expect(sessionsList).not.toHaveBeenCalled()
    expect(undoFailedRefund).not.toHaveBeenCalled()
  })

  it("alerts nobody about a failed refund whose Checkout Session has no order in this shop", async () => {
    undoFailedRefund.mockResolvedValue(undefined)

    await dispatch(refundFailedEvent(failedFullRefund))

    expect(scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    expect(sendIncidentAlert).not.toHaveBeenCalled()
    expect(consoleInfo).toHaveBeenCalledWith("Refund re_test_1 failed but Checkout Session cs_resolved_1 has no order; skipping.")
  })
})
