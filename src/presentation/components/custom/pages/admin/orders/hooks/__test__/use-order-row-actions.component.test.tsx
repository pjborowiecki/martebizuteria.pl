import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import {
  useCancelOrder,
  useFulfillOrder,
  useMarkOrderDelivered,
  useMarkOrderShipped,
  useRefundOrder,
  useResendOrderEmail,
  useRestockOrder,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

const {
  cancelFn,
  deliverFn,
  fulfillFn,
  refundFn,
  resendEmailFn,
  restockFn,
  shipFn,
  syncQueryInvalidation,
  toastError,
  toastSuccess,
  toastWarning,
} = vi.hoisted(() => ({
  cancelFn: vi.fn<(input: { orderId: string }) => Promise<{ cancelledEmailSent: boolean; ok: true; orderId: string }>>(),
  deliverFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  fulfillFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  refundFn: vi.fn<(input: { orderId: string; restock: boolean }) => Promise<{ ok: true; orderId: string }>>(),
  resendEmailFn: vi.fn<(input: { eventId: string; orderId: string }) => Promise<{ emailSent: boolean; ok: true; orderId: string }>>(),
  restockFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  shipFn:
    vi.fn<(input: { orderId: string; trackingNumber?: string }) => Promise<{ ok: true; orderId: string; shippedEmailSent: boolean }>>(),
  syncQueryInvalidation: vi.fn(() => Promise.resolve(undefined)),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess, warning: toastWarning } }))

vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation }))

vi.mock("~/src/modules/order/use-cases/cancel-order", () => ({
  cancelOrderMutation: { mutationFn: cancelFn, mutationKey: ["order", "cancel"] },
}))
vi.mock("~/src/modules/order/use-cases/fulfill-order", () => ({
  fulfillOrderMutation: { mutationFn: fulfillFn, mutationKey: ["order", "fulfill"] },
}))
vi.mock("~/src/modules/order/use-cases/ship-order", () => ({
  shipOrderMutation: { mutationFn: shipFn, mutationKey: ["order", "ship"] },
}))
vi.mock("~/src/modules/order/use-cases/mark-order-delivered", () => ({
  markOrderDeliveredMutation: { mutationFn: deliverFn, mutationKey: ["order", "deliver"] },
}))
vi.mock("~/src/modules/order/use-cases/refund-admin-order", () => ({
  refundAdminOrderMutation: { mutationFn: refundFn, mutationKey: ["order", "refund"] },
}))
vi.mock("~/src/modules/order/use-cases/resend-order-email", () => ({
  resendOrderEmailMutation: { mutationFn: resendEmailFn, mutationKey: ["order", "resendEmail"] },
}))
vi.mock("~/src/modules/order/use-cases/restock-order", () => ({
  restockOrderMutation: { mutationFn: restockFn, mutationKey: ["order", "restock"] },
}))

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false } } })} router={createTestRouter()}>
    {children}
  </TestProviders>
)

describe("admin order action mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fulfillFn.mockResolvedValue({ ok: true, orderId: "order-1" })
    shipFn.mockResolvedValue({ ok: true, orderId: "order-1", shippedEmailSent: true })
    cancelFn.mockResolvedValue({ cancelledEmailSent: true, ok: true, orderId: "order-1" })
    deliverFn.mockResolvedValue({ ok: true, orderId: "order-1" })
    refundFn.mockResolvedValue({ ok: true, orderId: "order-1" })
  })

  it("calls the fulfil server function with the order id", async () => {
    const { result } = renderHook(() => useFulfillOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(fulfillFn).toHaveBeenCalledOnce()
    expect(fulfillFn.mock.calls[0]?.[0]).toStrictEqual({ orderId: "order-1" })
  })

  it("announces a fulfilment with its own description", async () => {
    const { result } = renderHook(() => useFulfillOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).toHaveBeenCalledWith("Order updated", { description: "Fulfillment started for this order." })
  })

  it("announces a shipment with its own description", async () => {
    const { result } = renderHook(() => useMarkOrderShipped(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).toHaveBeenCalledWith("Order updated", { description: "Order marked as shipped." })
    expect(toastWarning).not.toHaveBeenCalled()
  })

  it("warns the admin separately when the shipping email to the customer failed", async () => {
    shipFn.mockResolvedValue({ ok: true, orderId: "order-1", shippedEmailSent: false })
    const { result } = renderHook(() => useMarkOrderShipped(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastWarning).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).toHaveBeenCalledExactlyOnceWith("Order updated", { description: "Order marked as shipped." })
    expect(toastWarning).toHaveBeenCalledWith("Shipping email not sent yet", {
      description:
        "Resend did not take the shipping email. It is tried twice more within a few seconds. If it still fails, resend it from the order's Activity card, which also shows the error.",
    })
  })

  it("forwards the captured tracking details to the ship server function", async () => {
    const { result } = renderHook(() => useMarkOrderShipped(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1", trackingNumber: "00259007123456789012" })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(shipFn.mock.calls[0]?.[0]).toStrictEqual({ orderId: "order-1", trackingNumber: "00259007123456789012" })
  })

  it("announces a delivery with its own description", async () => {
    const { result } = renderHook(() => useMarkOrderDelivered(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).toHaveBeenCalledWith("Order updated", { description: "Order marked as delivered." })
  })

  it("announces a refund as pending Stripe confirmation and sends the admin's stock choice", async () => {
    const { result } = renderHook(() => useRefundOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1", restock: false })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

    expect(refundFn.mock.calls[0]?.[0]).toStrictEqual({ orderId: "order-1", restock: false })
    expect(toastSuccess).toHaveBeenCalledWith("Order updated", {
      description: "Refund submitted to Stripe. The order updates once Stripe confirms it.",
    })
  })

  it("announces a cancellation with its own description", async () => {
    const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).toHaveBeenCalledWith("Order updated", {
      description: "Order cancelled and its items returned to stock. A paid order shows the refund once Stripe confirms it.",
    })
    expect(toastWarning).not.toHaveBeenCalled()
  })

  it("warns the admin separately when the cancellation email to the customer failed", async () => {
    cancelFn.mockResolvedValue({ cancelledEmailSent: false, ok: true, orderId: "order-1" })
    const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastWarning).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).toHaveBeenCalledExactlyOnceWith("Order updated", {
      description: "Order cancelled and its items returned to stock. A paid order shows the refund once Stripe confirms it.",
    })
    expect(toastWarning).toHaveBeenCalledWith("Cancellation email not sent yet", {
      description:
        "Resend did not take the cancellation email. It is tried twice more within a few seconds. If it still fails, resend it from the order's Activity card, which also shows the error.",
    })
  })

  it("refreshes the admin order list and the customer's figures once the mutation settles", async () => {
    const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledTimes(2)
    })

    expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.anything(), ORDER_QUERY_KEYS.ADMIN.ORDERS)
    expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.anything(), USER_QUERY_KEYS.ADMIN.CUSTOMERS)
  })
})

describe("admin order return to stock", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    restockFn.mockResolvedValue({ ok: true, orderId: "order-1" })
  })

  it("announces the items of an order returned to stock", async () => {
    const { result } = renderHook(() => useRestockOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

    expect(restockFn.mock.calls[0]?.[0]).toStrictEqual({ orderId: "order-1" })
    expect(toastSuccess).toHaveBeenCalledWith("Order updated", { description: "The order's items are back in stock." })
  })
})

describe("admin order email resend", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resendEmailFn.mockResolvedValue({ emailSent: true, ok: true, orderId: "order-1" })
  })

  it("resends the email of the failed delivery and announces that it went out", async () => {
    const { result } = renderHook(() => useResendOrderEmail(), { wrapper: Wrapper })

    result.current.mutate({ eventId: "audit-3", orderId: "order-1" })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

    expect(resendEmailFn.mock.calls[0]?.[0]).toStrictEqual({ eventId: "audit-3", orderId: "order-1" })
    expect(toastSuccess).toHaveBeenCalledWith("Email sent", {
      description: "Resend took the email. The order's Activity card records it.",
    })
    expect(toastWarning).not.toHaveBeenCalled()
  })

  it("warns that a resend Resend refused is still being tried", async () => {
    resendEmailFn.mockResolvedValue({ emailSent: false, ok: true, orderId: "order-1" })
    const { result } = renderHook(() => useResendOrderEmail(), { wrapper: Wrapper })

    result.current.mutate({ eventId: "audit-3", orderId: "order-1" })
    await waitFor(() => {
      expect(toastWarning).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastWarning).toHaveBeenCalledWith("Email not sent yet", {
      description:
        "Resend did not take the email. It is tried twice more within a few seconds. If it still fails, the order's Activity card offers Resend email again.",
    })
  })

  it("explains that the email no longer needs resending and refreshes the order", async () => {
    resendEmailFn.mockRejectedValue(new AppError("CONFLICT"))
    const { result } = renderHook(() => useResendOrderEmail(), { wrapper: Wrapper })

    result.current.mutate({ eventId: "audit-3", orderId: "order-1" })
    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", {
      description: "This action is not available for the order's current state.",
    })
    expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.anything(), ORDER_QUERY_KEYS.ADMIN.ORDERS)
  })
})

describe("admin order action failures", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fulfillFn.mockResolvedValue({ ok: true, orderId: "order-1" })
    shipFn.mockResolvedValue({ ok: true, orderId: "order-1", shippedEmailSent: true })
    cancelFn.mockResolvedValue({ cancelledEmailSent: true, ok: true, orderId: "order-1" })
  })

  it("explains a missing order rather than showing the raw error", async () => {
    cancelFn.mockRejectedValue(new AppError("NOT_FOUND"))
    const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", { description: "This order no longer exists." })
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("explains a state conflict", async () => {
    fulfillFn.mockRejectedValue(new AppError("CONFLICT"))
    const { result } = renderHook(() => useFulfillOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", {
      description: "This action is not available for the order's current state.",
    })
  })

  it("explains that an open dispute stops the cancellation of a paid order", async () => {
    cancelFn.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.OPEN_DISPUTE))
    const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", {
      description:
        "This order has an open dispute, which decides what happens to its payment. Until the dispute closes, the payment cannot be refunded and the order cannot be cancelled.",
    })
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("falls back to the generic description for an unclassified failure", async () => {
    shipFn.mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => useMarkOrderShipped(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", { description: "Please try again in a moment." })
  })

  it("still refreshes the admin order list and the customer's figures after a failure", async () => {
    shipFn.mockRejectedValue(new AppError("FORBIDDEN"))
    const { result } = renderHook(() => useMarkOrderShipped(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledTimes(2)
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", { description: "Please try again in a moment." })
  })
})
