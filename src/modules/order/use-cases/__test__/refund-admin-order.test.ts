import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type AdminOrderRefundTarget } from "~/src/modules/order/order.accessors"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"

import { refundAdminOrder } from "../refund-admin-order"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const INVALID_STATE = { code: ERROR_CODES.CONFLICT, message: ORDER_ERROR_CODES.INVALID_STATE }

const target = vi.hoisted(() => ({ current: undefined as AdminOrderRefundTarget | undefined }))

const stripeApi = vi.hoisted(() => ({
  refundsCreate: vi.fn<(params: object) => Promise<{ id: string }>>(),
  sessionsRetrieve: vi.fn<(id: string) => Promise<{ payment_intent: string | { id: string } | null }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { checkout: { sessions: { retrieve: stripeApi.sessionsRetrieve } }, refunds: { create: stripeApi.refundsCreate } },
}))
vi.mock("~/src/modules/order/order.accessors", () => ({ getAdminOrderRefundTarget: () => Promise.resolve(target.current) }))
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
  target.current = { paymentStatus: "succeeded", status: "processing", transactionId: "cs_test_paid" }
  stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: "pi_test_paid" })
  stripeApi.refundsCreate.mockResolvedValue({ id: "re_test_1" })
})

describe("refundAdminOrder", () => {
  it("refunds the PaymentIntent behind the order's Checkout Session", async () => {
    await expect(refundAdminOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(stripeApi.sessionsRetrieve).toHaveBeenCalledWith("cs_test_paid")
    expect(stripeApi.refundsCreate).toHaveBeenCalledWith({ metadata: { orderId: ORDER_ID }, payment_intent: "pi_test_paid" })
  })

  it("refunds by id when the Checkout Session returns its PaymentIntent expanded", async () => {
    stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: { id: "pi_test_expanded" } })

    await expect(refundAdminOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })

    expect(stripeApi.refundsCreate).toHaveBeenCalledWith({ metadata: { orderId: ORDER_ID }, payment_intent: "pi_test_expanded" })
  })

  it("refuses a Checkout Session that never created a PaymentIntent", async () => {
    stripeApi.sessionsRetrieve.mockResolvedValue({ payment_intent: null })

    await expect(refundAdminOrder({ data: { orderId: ORDER_ID } })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses an order whose payment has not settled without calling Stripe", async () => {
    target.current = { paymentStatus: "pending", status: "processing", transactionId: "cs_test_paid" }

    await expect(refundAdminOrder({ data: { orderId: ORDER_ID } })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("refuses an order without a Checkout Session id without calling Stripe", async () => {
    target.current = { paymentStatus: "succeeded", status: "processing", transactionId: null }

    await expect(refundAdminOrder({ data: { orderId: ORDER_ID } })).rejects.toMatchObject(INVALID_STATE)
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })

  it("reports a missing order as not found", async () => {
    target.current = undefined

    await expect(refundAdminOrder({ data: { orderId: ORDER_ID } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: ORDER_ERROR_CODES.NOT_FOUND,
    })
    expect(stripeApi.sessionsRetrieve).not.toHaveBeenCalled()
    expect(stripeApi.refundsCreate).not.toHaveBeenCalled()
  })
})
