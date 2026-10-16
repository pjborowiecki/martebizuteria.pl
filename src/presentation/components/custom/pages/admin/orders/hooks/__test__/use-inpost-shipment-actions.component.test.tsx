import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { INPOST_ERROR_CODES } from "~/src/integrations/inpost/inpost.constants"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"

import {
  useCreateInpostShipment,
  useDownloadInpostLabel,
  useRefreshInpostShipment,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-inpost-shipment-actions"

const { createFn, labelFn, refreshFn, syncQueryInvalidation, toastError, toastSuccess } = vi.hoisted(() => ({
  createFn: vi.fn<(input: { orderId: string; parcelTemplate: string; weightKg?: number }) => Promise<{ ok: true; orderId: string }>>(),
  labelFn: vi.fn<(input: { orderId: string }) => Promise<{ content: string; fileName: string }>>(),
  refreshFn: vi.fn<(input: { orderId: string }) => Promise<{ ok: true; orderId: string }>>(),
  syncQueryInvalidation: vi.fn(() => Promise.resolve(undefined)),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation }))
vi.mock("~/src/modules/order/use-cases/create-inpost-shipment", () => ({
  createInpostShipmentMutation: { mutationFn: createFn, mutationKey: ["order", "createInpostShipment"] },
}))
vi.mock("~/src/modules/order/use-cases/refresh-inpost-shipment", () => ({
  refreshInpostShipmentMutation: { mutationFn: refreshFn, mutationKey: ["order", "refreshInpostShipment"] },
}))
vi.mock("~/src/modules/order/use-cases/get-inpost-shipment-label", () => ({
  getInpostShipmentLabelMutation: { mutationFn: labelFn, mutationKey: ["order", "getInpostShipmentLabel"] },
}))

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false } } })} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const ERROR_TITLE = "InPost did not complete this"

beforeEach(() => {
  vi.clearAllMocks()
  createFn.mockResolvedValue({ ok: true, orderId: "order-1" })
  refreshFn.mockResolvedValue({ ok: true, orderId: "order-1" })
  labelFn.mockResolvedValue({ content: "JVBERi0xLjQ=", fileName: "MRT-2026-00012-inpost.pdf" })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useCreateInpostShipment", () => {
  it("books the parcel, tells the admin how to get its label and refreshes the order", async () => {
    const { result } = renderHook(() => useCreateInpostShipment(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1", parcelTemplate: "small" })
    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledOnce()
    })

    expect(createFn.mock.calls[0]?.[0]).toStrictEqual({ orderId: "order-1", parcelTemplate: "small" })
    expect(toastSuccess).toHaveBeenCalledWith("InPost shipment created", {
      description: "InPost confirms it within a few moments. Refresh its status to get the tracking number and the label.",
    })
    expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.any(QueryClient), ORDER_QUERY_KEYS.ADMIN.ORDERS)
  })

  it.each([
    [
      INPOST_ERROR_CODES.REQUEST_REFUSED,
      ERROR_CODES.VALIDATION,
      "InPost refused the shipment. Check the customer's phone number and address, and the parcel size and weight.",
    ],
    [
      INPOST_ERROR_CODES.CREDENTIALS_REJECTED,
      ERROR_CODES.FORBIDDEN,
      "InPost did not accept the shop's access details, so the parcel cannot be created from here. Create it in InPost Manager and paste its tracking number when you mark the order shipped.",
    ],
    [
      INPOST_ERROR_CODES.NOT_CONFIGURED,
      ERROR_CODES.CONFLICT,
      "Automatic InPost shipping is not connected. Create the parcel in InPost Manager and paste its tracking number when you mark the order shipped.",
    ],
    [INPOST_ERROR_CODES.UNAVAILABLE, ERROR_CODES.INTERNAL_ERROR, "InPost did not answer. Try again in a moment."],
    [ORDER_ERROR_CODES.INVALID_STATE, ERROR_CODES.CONFLICT, "This action is not available for the order's current state."],
    [ORDER_ERROR_CODES.NOT_FOUND, ERROR_CODES.NOT_FOUND, "This order no longer exists."],
    [INPOST_ERROR_CODES.WEIGHT_REQUIRED, ERROR_CODES.VALIDATION, "Please try again in a moment."],
  ])("explains a %s failure", async (reason, code, description) => {
    createFn.mockRejectedValue(new AppError(code, reason))
    const { result } = renderHook(() => useCreateInpostShipment(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1", parcelTemplate: "medium", weightKg: 0.4 })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith(ERROR_TITLE, { description })
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})

describe("useRefreshInpostShipment", () => {
  it("reads the shipment back and refreshes the order", async () => {
    const { result } = renderHook(() => useRefreshInpostShipment(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledOnce()
    })

    expect(toastSuccess).toHaveBeenCalledWith("InPost status updated")
  })

  it("says InPost could not find a shipment it refused to read", async () => {
    refreshFn.mockRejectedValue(new AppError(ERROR_CODES.VALIDATION, INPOST_ERROR_CODES.REQUEST_REFUSED))
    const { result } = renderHook(() => useRefreshInpostShipment(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith(ERROR_TITLE, { description: "InPost could not find this shipment." })
  })
})

describe("useDownloadInpostLabel", () => {
  it("saves the label as a PDF named after the order without refreshing the order", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    const { result } = renderHook(() => useDownloadInpostLabel(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(click).toHaveBeenCalledOnce()
    })

    const [link] = click.mock.contexts
    if (!(link instanceof HTMLAnchorElement)) {
      throw new TypeError("No label link was clicked")
    }

    expect(link.getAttribute("href")).toBe("data:application/pdf;base64,JVBERi0xLjQ=")
    expect(link.getAttribute("download")).toBe("MRT-2026-00012-inpost.pdf")
    expect(syncQueryInvalidation).not.toHaveBeenCalled()
  })

  it("explains that the label is not ready until InPost confirms the shipment", async () => {
    labelFn.mockRejectedValue(new AppError(ERROR_CODES.VALIDATION, INPOST_ERROR_CODES.REQUEST_REFUSED))
    const { result } = renderHook(() => useDownloadInpostLabel(), { wrapper: Wrapper })

    result.current.mutate({ orderId: "order-1" })
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })

    expect(toastError).toHaveBeenCalledWith(ERROR_TITLE, {
      description: "InPost has no label for this shipment yet. Refresh its status: the label is ready once InPost confirms the shipment.",
    })
  })
})
