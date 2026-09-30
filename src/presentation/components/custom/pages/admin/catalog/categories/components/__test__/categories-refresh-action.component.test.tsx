import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const CATEGORIES_KEY = ["admin", "categories", "list"]

const STATS_KEY = ["admin", "categories", "stats"]

vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () => ({ queryKey: CATEGORIES_KEY }),
}))
vi.mock("~/src/modules/product-category/use-cases/get-category-stats", () => ({
  getCategoryStatsQuery: () => ({ queryKey: STATS_KEY }),
}))

import { CategoriesRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-refresh-action"

const REFRESH_LABEL = "Reload table data"

const pending: ((value: unknown) => void)[] = []

const startFetching = (queryClient: QueryClient, queryKey: readonly unknown[]): void => {
  void queryClient.query({
    queryFn: () =>
      new Promise((resolve) => {
        pending.push(resolve)
      }),
    queryKey,
  })
}

afterEach(() => {
  for (const resolve of pending) {
    resolve(null)
  }
  pending.length = 0
  cleanup()
})

let queryClient = new QueryClient()

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("CategoriesRefreshAction", () => {
  it("labels the button with the translated refresh action", () => {
    renderWithProviders(<CategoriesRefreshAction />, { queryClient })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeEnabled()
  })

  it("invalidates both the list and the stats queries", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    renderWithProviders(<CategoriesRefreshAction />, { queryClient })

    await userEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: CATEGORIES_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: STATS_KEY })
  })

  it("reports busy and disables itself while the list is fetching", async () => {
    startFetching(queryClient, CATEGORIES_KEY)
    renderWithProviders(<CategoriesRefreshAction />, { queryClient })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeDisabled()
    })
    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toHaveAttribute("aria-busy", "true")
  })

  it("reports busy while only the stats are fetching", async () => {
    startFetching(queryClient, STATS_KEY)
    renderWithProviders(<CategoriesRefreshAction />, { queryClient })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeDisabled()
    })
  })

  it("ignores an unrelated query that is fetching", () => {
    startFetching(queryClient, ["admin", "products"])
    renderWithProviders(<CategoriesRefreshAction />, { queryClient })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeEnabled()
  })
})
