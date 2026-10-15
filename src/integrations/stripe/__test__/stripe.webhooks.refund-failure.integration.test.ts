import type Stripe from "stripe"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import {
  charge,
  chargeRefundedEvent,
  checkoutSession,
  refund,
  refundFailedEvent,
  refundUpdatedEvent,
} from "./fixtures/stripe-webhook-events"
import refundedCopy from "~/messages/pl-PL/emails.order-refunded.json"

const { audits, sendEmail, sendIncidentAlert, sqlite, stripeApi } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    audits: {
      recordOrderEmailOutcome: vi.fn(),
      recordOrderRefundAudit: vi.fn(),
      recordOrderRefundFailedAudit: vi.fn(),
    },
    sendEmail: vi.fn<(options: Readonly<{ idempotencyKey?: string; subject: string; to: string }>) => Promise<string | undefined>>(),
    sendIncidentAlert: vi.fn<(incident: { detail: string; kind: string; reference: string }) => Promise<void>>(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    stripeApi: {
      refunds: { current: [] as Stripe.Refund[] },
      refundsList: vi.fn<(params: object) => { autoPagingToArray: (options: object) => Promise<Stripe.Refund[]> }>(),
      sessionsList: vi.fn<(params: object) => Promise<{ data: Stripe.Checkout.Session[] }>>(),
    },
  }
})

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { checkout: { sessions: { list: stripeApi.sessionsList } }, refunds: { list: stripeApi.refundsList } },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audits)
vi.mock("~/src/lib/incident-alert.server", () => ({ sendIncidentAlert }))

const SHOP_ORIGIN = "http://127.0.0.1:3000"

const ORDER_ID = "order-1"

const PAID_AMOUNT = 38_900

const REFUNDED_CHARGE = chargeRefundedEvent(charge({ amount: PAID_AMOUNT, amountRefunded: PAID_AMOUNT, paymentIntent: "pi_paid" }))

const FIRST_REFUND = { amount: PAID_AMOUNT, id: "re_first", paymentIntent: "pi_paid" }

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`no webhook handler is registered for ${event.type}`)
  }

  await handler(event)
}

const readPayment = () =>
  z
    .object({ refunded_amount: z.number(), status: z.string() })
    .parse(sqlite.prepare(`select status, refunded_amount from payment where id = 'payment-1'`).get())

const readOrderStatus = (): string =>
  z.object({ status: z.string() }).parse(sqlite.prepare(`select status from "order" where id = ?`).get(ORDER_ID)).status

const sentKeys = (): (string | undefined)[] => sendEmail.mock.calls.map(([email]) => email.idempotencyKey)

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  sqlite.exec(`
    delete from "order";
    delete from payment;
    delete from checkout;
    insert into checkout (id, email, status) values ('checkout-1', 'ada@marte.test', 'completed');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id)
      values ('payment-1', 'checkout-1', ${String(PAID_AMOUNT)}, 'stripe', 'succeeded', 'cs_paid');
    insert into "order" (id, checkout_id, payment_id, email, order_number, status, fulfillment_status, total, metadata)
      values ('${ORDER_ID}', 'checkout-1', 'payment-1', 'ada@marte.test', 'MRT-2026-00001', 'processing', 'not_fulfilled', ${String(PAID_AMOUNT)}, '{"locale":"pl-PL"}');
  `)
  stripeApi.refunds.current = []
  stripeApi.refundsList.mockImplementation(() => ({ autoPagingToArray: () => Promise.resolve(stripeApi.refunds.current) }))
  stripeApi.sessionsList.mockResolvedValue({
    data: [checkoutSession({ id: "cs_paid", paymentIntent: "pi_paid", returnUrl: `${SHOP_ORIGIN}/pl-PL/checkout?success=true` })],
  })
  sendEmail.mockResolvedValue(undefined)
  sendIncidentAlert.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("a refund that fails after Stripe reported it", () => {
  it("reopens the order, alerts the shop and emails the customer nothing more", async () => {
    stripeApi.refunds.current = [refund({ ...FIRST_REFUND, status: "succeeded" })]
    await dispatch(REFUNDED_CHARGE)

    expect(readPayment()).toStrictEqual({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(readOrderStatus()).toBe("refunded")
    expect(sentKeys()).toStrictEqual([`order-refunded/${ORDER_ID}/re_first`])

    const failed = refund({ ...FIRST_REFUND, failureReason: "lost_or_stolen_card", status: "failed" })
    stripeApi.refunds.current = [failed]
    await dispatch(refundFailedEvent(failed))

    expect(readPayment()).toStrictEqual({ refunded_amount: 0, status: "succeeded" })
    expect(readOrderStatus()).toBe("processing")
    expect(audits.recordOrderRefundFailedAudit).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "re_first", {
      detail: `${String(PAID_AMOUNT)} — failed — lost_or_stolen_card`,
      resourceId: ORDER_ID,
    })
    expect(sendIncidentAlert).toHaveBeenCalledExactlyOnceWith({
      detail: "MRT-2026-00001 — 389,00 PLN — failed — lost_or_stolen_card",
      kind: "refundFailed",
      reference: "re_first",
    })
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it("keeps the reopened order as it is when Stripe also reports the failure as a refund update, and when the old charge.refunded comes late", async () => {
    const failed = refund({ ...FIRST_REFUND, status: "failed" })
    stripeApi.refunds.current = [refund({ ...FIRST_REFUND, status: "succeeded" })]
    await dispatch(REFUNDED_CHARGE)
    stripeApi.refunds.current = [failed]
    await dispatch(refundFailedEvent(failed))

    await dispatch(refundUpdatedEvent(failed))
    await dispatch(REFUNDED_CHARGE)

    expect(readPayment()).toStrictEqual({ refunded_amount: 0, status: "succeeded" })
    expect(readOrderStatus()).toBe("processing")
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it("emails the customer about the same amount again once the shop issues a new refund that stands", async () => {
    const failed = refund({ ...FIRST_REFUND, status: "failed" })
    stripeApi.refunds.current = [refund({ ...FIRST_REFUND, status: "succeeded" })]
    await dispatch(REFUNDED_CHARGE)
    stripeApi.refunds.current = [failed]
    await dispatch(refundFailedEvent(failed))

    stripeApi.refunds.current = [refund({ ...FIRST_REFUND, id: "re_second", status: "pending" }), failed]
    await dispatch(REFUNDED_CHARGE)

    expect(readPayment()).toStrictEqual({ refunded_amount: PAID_AMOUNT, status: "refunded" })
    expect(readOrderStatus()).toBe("refunded")
    expect(sentKeys()).toStrictEqual([`order-refunded/${ORDER_ID}/re_first`, `order-refunded/${ORDER_ID}/re_second`])
    expect(sendEmail.mock.calls.map(([email]) => email.subject)).toStrictEqual([refundedCopy.subject, refundedCopy.subject])
  })
})

describe("a refund that fails while its charge.refunded is being recorded", () => {
  it("takes the refund back off the order and tells the customer nothing when refund.failed is handled in between", async () => {
    const failed = refund({ ...FIRST_REFUND, failureReason: "expired_or_canceled_card", status: "failed" })
    const staleRead = Promise.withResolvers<Stripe.Refund[]>()
    stripeApi.refundsList.mockImplementationOnce(() => ({ autoPagingToArray: () => staleRead.promise }))
    const recording = dispatch(REFUNDED_CHARGE)
    await vi.waitFor(() => {
      expect(stripeApi.refundsList).toHaveBeenCalledOnce()
    })

    stripeApi.refunds.current = [failed]
    await dispatch(refundFailedEvent(failed))
    staleRead.resolve([refund({ ...FIRST_REFUND, status: "pending" })])
    await recording

    expect(readPayment()).toStrictEqual({ refunded_amount: 0, status: "succeeded" })
    expect(readOrderStatus()).toBe("processing")
    expect(sendEmail).not.toHaveBeenCalled()
    expect(audits.recordOrderRefundFailedAudit).toHaveBeenCalledOnce()
    expect(sendIncidentAlert).toHaveBeenCalledOnce()
  })
})
