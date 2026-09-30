import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { syncQueryInvalidation } = vi.hoisted(() => ({ syncQueryInvalidation: vi.fn() }))

vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation }))
vi.mock("~/src/modules/user/use-cases/get-admin-customer-stats", () => ({
  getAdminCustomerStatsQuery: () => ({ queryKey: ["admin", "users", "customers", "stats"] }),
}))

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { CustomersRefreshAction } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-refresh-action"

const REFRESH_LABEL = "Reload table data"

const newQueryClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const withPendingQuery = (queryClient: QueryClient, queryKey: readonly unknown[]): void => {
  const pending = Promise.withResolvers<number>()
  void queryClient.query({ queryFn: () => pending.promise, queryKey })
}

const spinningIcon = (): Element | null => screen.getByRole("button", { name: REFRESH_LABEL }).querySelector(".animate-spin")

beforeEach(() => {
  syncQueryInvalidation.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("CustomersRefreshAction", () => {
  it("offers an enabled refresh action while nothing is loading", () => {
    renderWithProviders(<CustomersRefreshAction />, { queryClient: newQueryClient() })
    const button = screen.getByRole("button", { name: REFRESH_LABEL })

    expect(button).toBeEnabled()
    expect(button).toHaveAttribute("aria-busy", "false")
    expect(spinningIcon()).toBeNull()
  })

  it("invalidates the admin customer queries when pressed", () => {
    const queryClient = newQueryClient()
    renderWithProviders(<CustomersRefreshAction />, { queryClient })

    fireEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(syncQueryInvalidation).toHaveBeenCalledWith(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS)
  })

  it("waits while the customers page is loading", () => {
    const queryClient = newQueryClient()
    withPendingQuery(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE)
    renderWithProviders(<CustomersRefreshAction />, { queryClient })
    const button = screen.getByRole("button", { name: REFRESH_LABEL })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(spinningIcon()).not.toBeNull()
  })

  it("waits while the customer stats are loading", () => {
    const queryClient = newQueryClient()
    withPendingQuery(queryClient, ["admin", "users", "customers", "stats"])
    renderWithProviders(<CustomersRefreshAction />, { queryClient })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeDisabled()
  })

  it("ignores a query that belongs to another table", () => {
    const queryClient = newQueryClient()
    withPendingQuery(queryClient, ["admin", "orders", "page"])
    renderWithProviders(<CustomersRefreshAction />, { queryClient })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeEnabled()
  })
})
