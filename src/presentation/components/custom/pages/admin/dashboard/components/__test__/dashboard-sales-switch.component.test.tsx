import { QueryClient, noop } from "@tanstack/react-query"
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { STORE_SETTING_MUTATION_KEYS, STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { DashboardSalesSwitch } from "~/src/presentation/components/custom/pages/admin/dashboard/components/dashboard-sales-switch"

const { sales, toast } = vi.hoisted(() => ({
  sales: {
    fetchStatus: vi.fn<() => Promise<{ salesPaused: boolean }>>(),
    setPaused: vi.fn<(input: { salesPaused: boolean }) => Promise<{ salesPaused: boolean }>>(),
  },
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock("sonner", () => ({ toast }))
vi.mock("~/src/modules/store-setting/use-cases/get-sales-status", async () => {
  const { STORE_SETTING_QUERY_KEYS: keys } = await import("~/src/modules/store-setting/store-setting.constants")

  return {
    getAdminSalesStatusQuery: () => ({ queryFn: sales.fetchStatus, queryKey: keys.ADMIN.SALES }),
    getSalesStatusQuery: () => ({ queryFn: sales.fetchStatus, queryKey: keys.SALES }),
  }
})
vi.mock("~/src/modules/store-setting/use-cases/set-sales-paused", async () => {
  const { STORE_SETTING_MUTATION_KEYS: keys } = await import("~/src/modules/store-setting/store-setting.constants")

  return { setSalesPausedMutation: { mutationFn: sales.setPaused, mutationKey: keys.SET_SALES_PAUSED } }
})

const renderSwitch = (salesPaused: boolean) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(STORE_SETTING_QUERY_KEYS.ADMIN.SALES, { salesPaused })

  return renderWithProviders(<DashboardSalesSwitch />, { queryClient })
}

const salesSwitch = () => screen.getByRole("switch", { name: "Pause sales" })

beforeEach(() => {
  vi.clearAllMocks()
  sales.setPaused.mockImplementation((input) => Promise.resolve(input))
})

afterEach(cleanup)

describe("DashboardSalesSwitch", () => {
  it("shows open sales with the switch off", () => {
    renderSwitch(false)

    expect(salesSwitch()).not.toBeChecked()
    expect(screen.getByText("Open")).toBeInTheDocument()
    expect(screen.getByText("Customers can check out and pay.")).toBeInTheDocument()
  })

  it("shows paused sales with the switch on and says what customers see", () => {
    renderSwitch(true)

    expect(salesSwitch()).toBeChecked()
    expect(screen.getByText("Paused")).toBeInTheDocument()
    expect(
      screen.getByText(
        "The storefront shows a notice and checkout refuses new payments. A payment a customer had already started still becomes an order.",
      ),
    ).toBeInTheDocument()
  })

  it("pauses sales on the server and shows the new state in the admin and storefront caches", async () => {
    const { queryClient } = renderSwitch(false)

    fireEvent.click(salesSwitch())

    await waitFor(() => {
      expect(salesSwitch()).toBeChecked()
    })
    expect(sales.setPaused.mock.calls[0]?.[0]).toStrictEqual({ salesPaused: true })
    expect(queryClient.getQueryData(STORE_SETTING_QUERY_KEYS.SALES)).toStrictEqual({ salesPaused: true })
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Sales paused", {
      description: "Customers see a notice and cannot start a new checkout.",
    })
  })

  it("resumes sales from the paused state", async () => {
    const { queryClient } = renderSwitch(true)

    fireEvent.click(salesSwitch())

    await waitFor(() => {
      expect(salesSwitch()).not.toBeChecked()
    })
    expect(sales.setPaused.mock.calls[0]?.[0]).toStrictEqual({ salesPaused: false })
    expect(queryClient.getQueryData(STORE_SETTING_QUERY_KEYS.ADMIN.SALES)).toStrictEqual({ salesPaused: false })
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Sales resumed", { description: "Customers can check out again." })
  })

  it("holds the switch while the change is on its way", async () => {
    sales.setPaused.mockReturnValue(new Promise(noop))
    const { queryClient } = renderSwitch(false)

    fireEvent.click(salesSwitch())

    await waitFor(() => {
      expect(queryClient.isMutating({ mutationKey: STORE_SETTING_MUTATION_KEYS.SET_SALES_PAUSED })).toBe(1)
    })
    expect(salesSwitch()).toHaveAttribute("aria-disabled", "true")
    expect(salesSwitch()).not.toBeChecked()
  })

  it("keeps the shown state and says so when the server refuses the change", async () => {
    sales.setPaused.mockRejectedValue(new Error("FORBIDDEN"))
    renderSwitch(false)

    fireEvent.click(salesSwitch())

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith("Could not change sales", { description: "Please try again in a moment." })
    })
    expect(salesSwitch()).not.toBeChecked()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
