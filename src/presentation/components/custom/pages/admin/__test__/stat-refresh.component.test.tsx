import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const state = vi.hoisted(() => ({
  applyFilter: vi.fn(),
  load: vi.fn<() => Promise<unknown>>(),
  staleTime: 0,
}))

vi.mock("~/src/modules/product/use-cases/get-product-stats", () => ({
  getProductStatsQuery: () => ({ queryFn: state.load, queryKey: ["stats"], staleTime: state.staleTime }),
}))
vi.mock("~/src/modules/product-attribute/use-cases/get-product-attribute-stats", () => ({
  getProductAttributeStatsQuery: () => ({ queryFn: state.load, queryKey: ["stats"], staleTime: state.staleTime }),
}))
vi.mock("~/src/modules/user/use-cases/get-admin-customer-stats", () => ({
  getAdminCustomerStatsQuery: () => ({ queryFn: state.load, queryKey: ["stats"], staleTime: state.staleTime }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => ({ applyProductsFilter: state.applyFilter }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid", () => ({
  useAttributesDataGridContext: () => ({ applyAttributeStatFilter: state.applyFilter }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-data-grid", () => ({
  useCustomersDataGridContext: () => ({ applyCustomerStatFilter: state.applyFilter }),
}))

import { AttributesStats } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-stats"
import { ProductsStats } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-stats"
import { CustomersStats } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-stats"

const CASES = [
  {
    Component: AttributesStats,
    caption: "75% of all",
    label: "attributes",
    stats: { inUse: 3, total: 4, unused: 1, withChoices: 2 },
  },
  {
    Component: ProductsStats,
    caption: "75% of total",
    label: "products",
    stats: { active: 6, archived: 1, draft: 2, lowStock: 3, total: 8 },
  },
  {
    Component: CustomersStats,
    caption: "Customers with at least one order",
    label: "customers",
    stats: { averageLtv: 45_000, averageProductsPerOrder: 2.25, returningRate: 37, total: 1234 },
  },
] as const

beforeEach(() => {
  vi.clearAllMocks()
  state.staleTime = 0
})

afterEach(cleanup)

describe.each(CASES)("$label statistics refresh", ({ Component, caption, stats }) => {
  it("disables stale statistics until their replacement has arrived", async () => {
    const pending = Promise.withResolvers<unknown>()
    state.load.mockReturnValue(pending.promise)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["stats"], stats, { updatedAt: Date.now() - 60_000 })
    const { container, unmount } = renderWithProviders(<Component />, { queryClient })

    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByText(caption)).not.toBeInTheDocument()
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled()
      await userEvent.click(button)
    }
    expect(state.applyFilter).not.toHaveBeenCalled()

    await act(async () => {
      pending.resolve(stats)
      await pending.promise
    })
    expect(await screen.findByText(caption)).toBeInTheDocument()
    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(0)
    expect(screen.getAllByRole("button").every((button) => !button.hasAttribute("disabled"))).toBe(true)
    unmount()
    queryClient.clear()
  })

  it("keeps fresh cached statistics usable during a background refresh", async () => {
    state.staleTime = Number.POSITIVE_INFINITY
    const pending = Promise.withResolvers<unknown>()
    state.load.mockReturnValue(pending.promise)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["stats"], stats)
    const { unmount } = renderWithProviders(<Component />, { queryClient })

    act(() => {
      void queryClient.refetchQueries({ queryKey: ["stats"] })
    })
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(1)
    })
    expect(screen.getByText(caption)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /(?:All attributes|Total products|Total Customers)/u }))
    expect(state.applyFilter).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve(stats)
      await pending.promise
    })
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0)
    })
    expect(screen.getByText(caption)).toBeInTheDocument()
    unmount()
    queryClient.clear()
  })
})
