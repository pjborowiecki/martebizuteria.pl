import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type AdminOrderRefundTarget } from "~/src/modules/order/order.accessors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"

import { refundAdminOrder, refundAdminOrderMutation } from "../refund-admin-order"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const IDEMPOTENCY = { idempotencyKey: `admin-order-refund-${ORDER_ID}` }

const KEEP_OUT_OF_STOCK = { orderId: ORDER_ID, restock: false }

const BACK_IN_STOCK = { orderId: ORDER_ID, restock: true }

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const PAID_TARGET: AdminOrderRefundTarget = {
  fulfillmentStatus: "not_fulfilled",
  metadata: null,
  paymentStatus: "succeeded",
  status: "processing",
  total: 12_900,
  transactionId: "cs_test_paid",
}

const DISPUTED_METADATA = JSON.stringify({
  dispute: { amount: 12_900, id: "dp_test_1", reason: "fraudulent", status: "needs_response" },
  locale: "pl-PL",
})

const target = vi.hoisted(() => ({ current: undefined as AdminOrderRefundTarget | undefined }))

interface RetrievedSession {
  readonly payment_intent: string | { id: string } | null
  readonly payment_status: "no_payment_required" | "paid" | "unpaid"
}

const returnOrderToStock = vi.hoisted(() => vi.fn<(orderId: string) => Promise<boolean>>())

const audit = vi.hoisted(() => ({ recordOrderRefundRequestedAudit: vi.fn() }))

const stripeApi = vi.hoisted(() => ({
  refundsCreate: vi.fn<(params: object, options: object) => Promise<{ id: string }>>(),
  sessionsRetrieve: vi.fn<(id: string) => Promise<RetrievedSession>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { checkout: { sessions: { retrieve: stripeApi.sessionsRetrieve } }, refunds: { create: stripeApi.refundsCreate } },
}))
vi.mock("~/src/modules/order/order.accessors", () => ({ getAdminOrderRefundTarget: () => Promise.resolve(target.current) }))
vi.mock("~/src/modules/order/order.restock.server", () => ({ returnOrderToStock }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audit)
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

beforeEach(() => {
  vi.clearAllMocks()
  target.current = PAID_TARGET
  stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: "pi_test_paid", payment_status: "paid" })
  stripeApi.refundsCreate.mockResolvedValue({ id: "re_test_1" })
  returnOrderToStock.mockResolvedValue(true)
})

describe("refundAdminOrder", () => {
  it("refunds the PaymentIntent behind the order's Checkout Session", async () => {
    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(stripeApi.sessionsRetrieve).toHaveBeenCalledWith("cs_test_paid")
    expect(stripeApi.refundsCreate).toHaveBeenCalledWith({ metadata: { orderId: ORDER_ID }, payment_intent: "pi_test_paid" }, IDEMPOTENCY)
  })

  it("records the refund the admin asked Stripe for against the order", async () => {
    await refundAdminOrder({ data: KEEP_OUT_OF_STOCK })

    expect(audit.recordOrderRefundRequestedAudit).toHaveBeenCalledExactlyOnceWith(ORDER_ID)
  })

  it("leaves the order's items out of stock unless the admin says they came back", async () => {
    await refundAdminOrder({ data: KEEP_OUT_OF_STOCK })

    expect(returnOrderToStock).not.toHaveBeenCalled()
  })

  it("returns the order's items to stock when the admin says they came back", async () => {
    await expect(refundAdminOrder({ data: BACK_IN_STOCK })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(returnOrderToStock).toHaveBeenCalledExactlyOnceWith(ORDER_ID)
  })

  it("keeps the items out of stock when Stripe refuses the refund", async () => {
    stripeApi.refundsCreate.mockRejectedValue(new Error("This charge has already been refunded."))

    await expect(refundAdminOrder({ data: BACK_IN_STOCK })).rejects.toThrow("This charge has already been refunded.")
    expect(returnOrderToStock).not.toHaveBeenCalled()
    expect(audit.recordOrderRefundRequestedAudit).not.toHaveBeenCalled()
  })

  it("refunds by id when the Checkout Session returns its PaymentIntent expanded", async () => {
    stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: { id: "pi_test_expanded" }, payment_status: "paid" })

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(stripeApi.refundsCreate).toHaveBeenCalledWith(
      { metadata: { orderId: ORDER_ID }, payment_intent: "pi_test_expanded" },
      IDEMPOTENCY,
    )
  })

  it("sends a repeated refund of the same order under the same idempotency key", async () => {
    await Promise.all([refundAdminOrder({ data: KEEP_OUT_OF_STOCK }), refundAdminOrder({ data: KEEP_OUT_OF_STOCK })])

    expect(stripeApi.refundsCreate).toHaveBeenCalledTimes(2)
    expect(stripeApi.refundsCreate.mock.calls.map(([, options]) => options)).toStrictEqual([IDEMPOTENCY, IDEMPOTENCY])
  })

  it("refunds an order whose metadata carries no dispute", async () => {
    target.current = { ...PAID_TARGET, metadata: JSON.stringify({ locale: "pl-PL" }) }

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })
    expect(stripeApi.refundsCreate).toHaveBeenCalledOnce()
  })

  it("refuses an order with an open dispute without calling Stripe", async () => {
    target.current = { ...PAID_TARGET, metadata: DISPUTED_METADATA }

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses a free order without calling Stripe", async () => {
    target.current = { ...PAID_TARGET, total: 0 }

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses a Checkout Session that required no payment", async () => {
    stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: "pi_test_paid", payment_status: "no_payment_required" })

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses a Checkout Session that never created a PaymentIntent", async () => {
    stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: null, payment_status: "paid" })

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses an order that was cancelled without calling Stripe", async () => {
    target.current = { ...PAID_TARGET, fulfillmentStatus: "cancelled", status: "cancelled" }

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses an order whose payment has not settled without calling Stripe", async () => {
    target.current = { ...PAID_TARGET, paymentStatus: "pending" }

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses an order without a Checkout Session id without calling Stripe", async () => {
    target.current = { ...PAID_TARGET, transactionId: null }

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("reports a missing order as not found", async () => {
    target.current = undefined

    await expect(refundAdminOrder({ data: KEEP_OUT_OF_STOCK })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: ORDER_ERROR_CODES.NOT_FOUND,
    })
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })
})

describe("refundAdminOrderMutation", () => {
  it("keys its mutation by the shared refund key", () => {
    expect(refundAdminOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.REFUND)
  })

  it("refunds the order the mutation was handed", async () => {
    await expect(new MutationObserver(new QueryClient(), refundAdminOrderMutation).mutate(BACK_IN_STOCK)).resolves.toStrictEqual({
      ok: true,
      orderId: ORDER_ID,
    })
    expect(stripeApi.refundsCreate).toHaveBeenCalledWith({ metadata: { orderId: ORDER_ID }, payment_intent: "pi_test_paid" }, IDEMPOTENCY)
    expect(returnOrderToStock).toHaveBeenCalledExactlyOnceWith(ORDER_ID)
  })
})
