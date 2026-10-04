import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { StubBroadcastChannel } from "~/src/platform/testing/mocks/broadcast-channel"

vi.mock("~/src/modules/user/use-cases/get-admin-customer-stats", () => ({
  getAdminCustomerStatsQuery: () => ({ queryKey: ["admin", "users", "customers", "stats"] }),
}))

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { CustomersRefreshAction } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-refresh-action"

const REFRESH_LABEL = "Reload table data"

const CUSTOMER_DETAIL_KEY = [...USER_QUERY_KEYS.ADMIN.CUSTOMER_BY_ID, "usr_1"]

vi.stubGlobal("BroadcastChannel", StubBroadcastChannel)

const newQueryClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const withPendingQuery = (queryClient: QueryClient, queryKey: readonly unknown[]): void => {
  const pending = Promise.withResolvers<number>()
  void queryClient.query({ queryFn: () => pending.promise, queryKey })
}

const spinningIcon = (): Element | null => screen.getByRole("button", { name: REFRESH_LABEL }).querySelector(".animate-spin")

beforeEach(() => {
  StubBroadcastChannel.posted.mockClear()
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

  it("drops the cached customer queries off screen when pressed, without telling the browser's other tabs", () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(CUSTOMER_DETAIL_KEY, { id: "usr_1" })
    renderWithProviders(<CustomersRefreshAction />, { queryClient })

    fireEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(queryClient.getQueryState(CUSTOMER_DETAIL_KEY)).toBeUndefined()
    expect(StubBroadcastChannel.posted).not.toHaveBeenCalled()
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
