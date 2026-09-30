import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const ATTRIBUTES_KEY = ["admin", "attributes", "list"]

const STATS_KEY = ["admin", "attributes", "stats"]

vi.mock("~/src/modules/product-attribute/use-cases/get-admin-product-attributes", () => ({
  getAdminProductAttributesQuery: () => ({ queryKey: ATTRIBUTES_KEY }),
}))
vi.mock("~/src/modules/product-attribute/use-cases/get-product-attribute-stats", () => ({
  getProductAttributeStatsQuery: () => ({ queryKey: STATS_KEY }),
}))

import { AttributesRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-refresh-action"

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

describe("AttributesRefreshAction", () => {
  it("labels the button with the translated refresh action", () => {
    renderWithProviders(<AttributesRefreshAction />, { queryClient })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeEnabled()
  })

  it("invalidates both the list and the stats queries", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    renderWithProviders(<AttributesRefreshAction />, { queryClient })

    await userEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ATTRIBUTES_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: STATS_KEY })
  })

  it("reports busy and disables itself while the list is fetching", async () => {
    startFetching(queryClient, ATTRIBUTES_KEY)
    renderWithProviders(<AttributesRefreshAction />, { queryClient })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeDisabled()
    })
    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toHaveAttribute("aria-busy", "true")
  })

  it("reports busy while only the stats are fetching", async () => {
    startFetching(queryClient, STATS_KEY)
    renderWithProviders(<AttributesRefreshAction />, { queryClient })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeDisabled()
    })
  })

  it("ignores an unrelated query that is fetching", () => {
    startFetching(queryClient, ["admin", "products"])
    renderWithProviders(<AttributesRefreshAction />, { queryClient })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeEnabled()
  })
})
