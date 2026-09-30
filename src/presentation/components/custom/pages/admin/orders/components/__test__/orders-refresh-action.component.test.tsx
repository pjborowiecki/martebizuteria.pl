import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { syncQueryInvalidation } = vi.hoisted(() => ({ syncQueryInvalidation: vi.fn() }))

vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation }))
vi.mock("~/src/modules/order/use-cases/get-admin-order-stats", () => ({
  getAdminOrderStatsQuery: () => ({ queryKey: ["admin", "orders", "stats"] }),
}))

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"

import { OrdersRefreshAction } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-refresh-action"

const REFRESH_LABEL = "Refresh orders"

const newQueryClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const withPendingQuery = (queryClient: QueryClient, queryKey: readonly unknown[]): void => {
  const pending = Promise.withResolvers<number>()
  void queryClient.query({ queryFn: () => pending.promise, queryKey })
}

beforeEach(() => {
  syncQueryInvalidation.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("OrdersRefreshAction", () => {
  it("offers an enabled refresh action while nothing is loading", () => {
    renderWithProviders(<OrdersRefreshAction />, { queryClient: newQueryClient() })
    const button = screen.getByRole("button", { name: REFRESH_LABEL })

    expect(button).toBeEnabled()
    expect(button).toHaveAttribute("aria-busy", "false")
  })

  it("invalidates the admin order queries when pressed", () => {
    const queryClient = newQueryClient()
    renderWithProviders(<OrdersRefreshAction />, { queryClient })
    fireEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(syncQueryInvalidation).toHaveBeenCalledWith(queryClient, ORDER_QUERY_KEYS.ADMIN.ORDERS)
  })

  it("waits while the orders page is loading", () => {
    const queryClient = newQueryClient()
    withPendingQuery(queryClient, ORDER_QUERY_KEYS.ADMIN.PAGE)
    renderWithProviders(<OrdersRefreshAction />, { queryClient })
    const button = screen.getByRole("button", { name: REFRESH_LABEL })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
  })

  it("waits while the order stats are loading", () => {
    const queryClient = newQueryClient()
    withPendingQuery(queryClient, ["admin", "orders", "stats"])
    renderWithProviders(<OrdersRefreshAction />, { queryClient })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeDisabled()
  })
})
