import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { AppError } from "~/src/modules/_core/constants/errors"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"

import {
  useCancelOrder,
  useFulfillOrder,
  useMarkOrderDelivered,
  useMarkOrderShipped,
  useRefundOrder,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions"

const { cancelFn, deliverFn, fulfillFn, refundFn, shipFn, syncQueryInvalidation, toastError, toastSuccess } = vi.hoisted(() => ({
  cancelFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  deliverFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  fulfillFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  refundFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  shipFn: vi.fn<(input: { orderId: string; trackingNumber?: string }) => Promise<{ ok: true; orderId: string }>>(),
  syncQueryInvalidation: vi.fn(() => Promise.resolve(undefined)),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))

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

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false } } })} router={createTestRouter()}>
    {children}
  </TestProviders>
)

describe("admin order action mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fulfillFn.mockResolvedValue({ ok: true, orderId: "order-1" })
    shipFn.mockResolvedValue({ ok: true, orderId: "order-1" })
    cancelFn.mockResolvedValue({ ok: true, orderId: "order-1" })
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

  it("announces a refund as pending Stripe confirmation", async () => {
    const { result } = renderHook(() => useRefundOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledOnce()
    })

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

    expect(toastSuccess).toHaveBeenCalledWith("Order updated", { description: "Order cancelled." })
  })

  it("invalidates the admin order list once the mutation settles", async () => {
    const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledOnce()
    })

    expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.anything(), ORDER_QUERY_KEYS.ADMIN.ORDERS)
  })
})

describe("admin order action failures", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fulfillFn.mockResolvedValue({ ok: true, orderId: "order-1" })
    shipFn.mockResolvedValue({ ok: true, orderId: "order-1" })
    cancelFn.mockResolvedValue({ ok: true, orderId: "order-1" })
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

  it("falls back to the generic description for an unclassified failure", async () => {
    shipFn.mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => useMarkOrderShipped(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", { description: "Please try again in a moment." })
  })

  it("still invalidates the admin order list after a failure", async () => {
    shipFn.mockRejectedValue(new AppError("FORBIDDEN"))
    const { result } = renderHook(() => useMarkOrderShipped(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith("Could not update order", { description: "Please try again in a moment." })
  })
})
