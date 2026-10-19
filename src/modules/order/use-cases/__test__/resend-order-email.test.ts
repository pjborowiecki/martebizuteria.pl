import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const FAILED_EVENT_ID = "0192f3a4-5b6c-7d8e-9fab-cdef0123aaaa"

const SENT_EVENT_ID = "0192f3a4-5b6c-7d8e-9fab-cdef0123bbbb"

const SHOP_ORIGIN = "http://127.0.0.1:3000"

const RETURN_URL = `${SHOP_ORIGIN}/pl-PL/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`

const permissions = vi.hoisted(() => [] as unknown[])

const notify = vi.hoisted(() => ({
  cancelled: vi.fn<(cancellation: object, origin: string) => Promise<boolean>>(),
  confirmed: vi.fn<(session: object, orderId: string) => Promise<boolean>>(),
  delivered: vi.fn<(orderId: string, origin: string) => Promise<boolean>>(),
  inProgress: vi.fn<(orderId: string, origin: string) => Promise<boolean>>(),
  newOrder: vi.fn<(orderId: string, returnUrl: string | undefined) => Promise<boolean>>(),
  refunded: vi.fn<(refund: object, returnUrl: string | undefined) => Promise<boolean>>(),
  shipped: vi.fn<(orderId: string, origin: string) => Promise<boolean>>(),
  tracking: vi.fn<(email: object) => Promise<boolean>>(),
}))

const orders = vi.hoisted(() => ({
  getAdminOrderRefundTarget: vi.fn<(orderId: string) => Promise<{ transactionId: string | null } | undefined>>(),
  getAdminOrderTimelineRows: vi.fn<(orderId: string) => Promise<object[]>>(),
}))

const sessionsRetrieve = vi.hoisted(() => vi.fn<(sessionId: string) => Promise<object>>())

const recordEmailResendRequestedAudit = vi.hoisted(() => vi.fn())

const incoming = vi.hoisted(() => ({ getRequest: vi.fn<() => Request>() }))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: incoming.getRequest }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  authorized: (permission: unknown) => {
    permissions.push(permission)

    return {}
  },
}))
vi.mock("~/src/modules/order/use-cases/send-new-order-email.server", () => ({ sendNewOrderEmail: notify.newOrder }))
vi.mock("~/src/modules/order/use-cases/send-order-cancelled-email.server", () => ({ sendOrderCancelledEmail: notify.cancelled }))
vi.mock("~/src/modules/order/use-cases/send-order-refunded-email.server", () => ({ sendOrderRefundedEmail: notify.refunded }))
vi.mock("~/src/modules/order/use-cases/send-order-shipped-email.server", () => ({ sendOrderShippedEmail: notify.shipped }))
vi.mock("~/src/modules/order/use-cases/send-order-in-progress-email.server", () => ({ sendOrderInProgressEmail: notify.inProgress }))
vi.mock("~/src/modules/order/use-cases/send-order-delivered-email.server", () => ({ sendOrderDeliveredEmail: notify.delivered }))
vi.mock("~/src/modules/order/use-cases/send-order-tracking-email.server", () => ({ sendOrderTrackingEmail: notify.tracking }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { retrieve: sessionsRetrieve } } } }))
vi.mock("~/src/modules/order/use-cases/send-order-confirmation-email.server", () => ({ sendOrderConfirmationEmail: notify.confirmed }))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordEmailResendRequestedAudit,
}))
vi.mock("~/src/modules/order/order.accessors", () => orders)
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ data: builder.validate(options.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"

import { executionContextStorage } from "~/src/lib/background"

import { resendOrderEmail, resendOrderEmailMutation } from "../resend-order-email"

const INVALID_STATE = new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)

const CHECKOUT_SESSION = { id: "cs_paid", return_url: RETURN_URL }

const deliveryRow = (id: string, action: string, orderEmail: object) => ({
  action,
  actorName: "System",
  createdAt: new Date("2026-10-10T10:00:00.000Z"),
  detail: "Order shipped → anna@example.com — Resend did not answer within 10000 ms",
  id,
  metadata: JSON.stringify({ idempotencyKey: `order-email/${ORDER_ID}`, orderEmail }),
  severity: "error",
})

const failedDelivery = (orderEmail: object) => [deliveryRow(FAILED_EVENT_ID, AUDIT_LOG_ACTION.EMAIL_FAILED, orderEmail)]

const resend = (eventId = FAILED_EVENT_ID) => resendOrderEmail({ data: { eventId, orderId: ORDER_ID } })

beforeEach(() => {
  vi.clearAllMocks()
  incoming.getRequest.mockReturnValue(new Request(`${SHOP_ORIGIN}/_serverFn/resend-order-email`))
  orders.getAdminOrderRefundTarget.mockResolvedValue({ transactionId: "cs_paid" })
  orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "order-shipped" }))
  sessionsRetrieve.mockResolvedValue(CHECKOUT_SESSION)
  for (const notifier of Object.values(notify)) {
    notifier.mockResolvedValue(true)
  }
})

describe("resendOrderEmail", () => {
  it("requires the permission to update orders", () => {
    expect(permissions).toStrictEqual([{ order: ["update"] }])
  })

  it("sends a failed shipping email again, linked on the deployment the admin works on, and reports it as sent", async () => {
    await expect(resend()).resolves.toStrictEqual({ emailSent: true, ok: true, orderId: ORDER_ID })

    expect(orders.getAdminOrderTimelineRows).toHaveBeenCalledWith(ORDER_ID)
    expect(notify.shipped).toHaveBeenCalledExactlyOnceWith(ORDER_ID, SHOP_ORIGIN)
    expect(sessionsRetrieve).not.toHaveBeenCalled()
  })

  it("records in the audit log which failed delivery the admin had sent again", async () => {
    await resend()

    expect(recordEmailResendRequestedAudit).toHaveBeenCalledExactlyOnceWith(ORDER_ID, {
      detail: "Order shipped → anna@example.com — Resend did not answer within 10000 ms",
      metadata: { idempotencyKey: `order-email/${ORDER_ID}` },
    })
  })

  it("sends the fulfilment email again, linked on the deployment the admin works on", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "order-in-progress" }))

    await resend()

    expect(notify.inProgress).toHaveBeenCalledExactlyOnceWith(ORDER_ID, SHOP_ORIGIN)
  })

  it("sends the thank-you email again, linked on the deployment the admin works on", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "order-delivered" }))

    await resend()

    expect(notify.delivered).toHaveBeenCalledExactlyOnceWith(ORDER_ID, SHOP_ORIGIN)
  })

  it("sends a tracking number email again with the number the failed delivery carried", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "order-tracking", trackingNumber: "TRK-43" }))

    await resend()

    expect(notify.tracking).toHaveBeenCalledExactlyOnceWith({ orderId: ORDER_ID, origin: SHOP_ORIGIN, trackingNumber: "TRK-43" })
    expect(notify.shipped).not.toHaveBeenCalled()
  })

  it("sends a cancellation again with the refund the failed delivery named", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "order-cancelled", refundedAmount: 38_900 }))

    await resend()

    expect(notify.cancelled).toHaveBeenCalledExactlyOnceWith({ orderId: ORDER_ID, refundedAmount: 38_900 }, SHOP_ORIGIN)
  })

  it("reports an email Resend refused again as not sent", async () => {
    notify.shipped.mockResolvedValue(false)

    await expect(resend()).resolves.toStrictEqual({ emailSent: false, ok: true, orderId: ORDER_ID })
  })

  it("keeps the resend running for the Worker when the admin closes the page", async () => {
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>()

    await executionContextStorage.run({ waitUntil }, () => resend())

    expect(waitUntil).toHaveBeenCalledOnce()
  })

  it("refuses an email that went out after the delivery the admin pressed resend on", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue([
      deliveryRow(SENT_EVENT_ID, AUDIT_LOG_ACTION.EMAIL_SENT, { kind: "order-shipped" }),
      deliveryRow(FAILED_EVENT_ID, AUDIT_LOG_ACTION.EMAIL_FAILED, { kind: "order-shipped" }),
    ])

    await expect(resend()).rejects.toStrictEqual(INVALID_STATE)

    expect(notify.shipped).not.toHaveBeenCalled()
    expect(recordEmailResendRequestedAudit).not.toHaveBeenCalled()
  })

  it("refuses an activity entry that is no email delivery of this order", async () => {
    await expect(resend(SENT_EVENT_ID)).rejects.toStrictEqual(INVALID_STATE)

    expect(notify.shipped).not.toHaveBeenCalled()
  })

  it("refuses an event id that cannot name an audit entry", () => {
    expect(() => resendOrderEmail({ data: { eventId: "audit-1", orderId: ORDER_ID } })).toThrow()
  })

  it("keys its mutation by the shared resend key", () => {
    expect(resendOrderEmailMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.RESEND_EMAIL)
  })

  it("resends the email the mutation was handed", async () => {
    await expect(
      new MutationObserver(new QueryClient(), resendOrderEmailMutation).mutate({ eventId: FAILED_EVENT_ID, orderId: ORDER_ID }),
    ).resolves.toStrictEqual({ emailSent: true, ok: true, orderId: ORDER_ID })
  })
})

describe("resendOrderEmail for an email built from the order's Checkout Session", () => {
  it("sends the shop's new-order notice again, linked through the order's Checkout Session", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "new-order" }))

    await resend()

    expect(orders.getAdminOrderRefundTarget).toHaveBeenCalledWith(ORDER_ID)
    expect(sessionsRetrieve).toHaveBeenCalledExactlyOnceWith("cs_paid")
    expect(notify.newOrder).toHaveBeenCalledExactlyOnceWith(ORDER_ID, RETURN_URL)
  })

  it("sends a refund email again with the amount and the Stripe refund of that refund", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(
      failedDelivery({ amount: 5000, fullyRefunded: false, kind: "order-refunded", refundId: "re_partial", refundedTotal: 8000 }),
    )

    await resend()

    expect(notify.refunded).toHaveBeenCalledExactlyOnceWith(
      { amount: 5000, fullyRefunded: false, orderId: ORDER_ID, refundId: "re_partial", refundedTotal: 8000 },
      RETURN_URL,
    )
  })

  it("sends a refund email recorded before emails named their Stripe refund again without one", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(
      failedDelivery({ amount: 5000, fullyRefunded: false, kind: "order-refunded", refundedTotal: 8000 }),
    )

    await resend()

    expect(notify.refunded).toHaveBeenCalledExactlyOnceWith(
      { amount: 5000, fullyRefunded: false, orderId: ORDER_ID, refundId: undefined, refundedTotal: 8000 },
      RETURN_URL,
    )
  })

  it("sends the order confirmation again from the order's Checkout Session", async () => {
    orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "order-confirmation" }))

    await resend()

    expect(notify.confirmed).toHaveBeenCalledExactlyOnceWith(CHECKOUT_SESSION, ORDER_ID)
  })

  it.each([
    ["has no payment", undefined],
    ["has no Stripe transaction", { transactionId: null }],
    ["has an empty Stripe transaction", { transactionId: "" }],
  ])("refuses to rebuild a webhook email for an order that %s", async (_case, target) => {
    orders.getAdminOrderRefundTarget.mockResolvedValue(target)
    orders.getAdminOrderTimelineRows.mockResolvedValue(failedDelivery({ kind: "order-confirmation" }))

    await expect(resend()).rejects.toStrictEqual(INVALID_STATE)

    expect(sessionsRetrieve).not.toHaveBeenCalled()
    expect(notify.confirmed).not.toHaveBeenCalled()
  })
})
