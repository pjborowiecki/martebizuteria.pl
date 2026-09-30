import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionsRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-refresh-action"

const COLLECTIONS_KEY = ["admin", "collections"] as const

const STATS_KEY = ["admin", "collections", "stats"] as const

vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({
  getAdminCollectionsQuery: () => ({ queryKey: COLLECTIONS_KEY }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-collection-stats", () => ({
  getCollectionStatsQuery: () => ({ queryKey: STATS_KEY }),
}))

const REFRESH_LABEL = "Reload table data"

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const neverSettles = () => new Promise<never>(() => {})

const startPendingQuery = (queryClient: QueryClient, queryKey: readonly string[]) => {
  queryClient.query({ queryFn: neverSettles, queryKey }).catch(() => {})
}

const renderRefreshAction = (queryClient = createQueryClient()) => {
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  renderWithProviders(<CollectionsRefreshAction />, { queryClient })

  return { button: screen.getByRole("button", { name: REFRESH_LABEL }), invalidate }
}

describe("CollectionsRefreshAction", () => {
  afterEach(() => {
    cleanup()
  })

  it("offers a labelled refresh button that is ready to use", () => {
    const { button } = renderRefreshAction()

    expect(button).toBeEnabled()
    expect(button).toHaveAttribute("aria-busy", "false")
  })

  it("invalidates both the table rows and the stat cards", async () => {
    const { button, invalidate } = renderRefreshAction()

    await userEvent.click(button)

    expect(invalidate).toHaveBeenCalledWith({ queryKey: COLLECTIONS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: STATS_KEY })
  })

  it("locks itself while the table rows are still loading", () => {
    const queryClient = createQueryClient()
    startPendingQuery(queryClient, COLLECTIONS_KEY)

    const { button } = renderRefreshAction(queryClient)

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
  })

  it("locks itself while the stat cards are still loading", () => {
    const queryClient = createQueryClient()
    startPendingQuery(queryClient, STATS_KEY)

    const { button } = renderRefreshAction(queryClient)

    expect(button).toBeDisabled()
  })

  it("cannot be pressed while it is already refreshing", async () => {
    const queryClient = createQueryClient()
    startPendingQuery(queryClient, COLLECTIONS_KEY)
    const { button, invalidate } = renderRefreshAction(queryClient)
    invalidate.mockClear()

    await userEvent.click(button)

    expect(invalidate).not.toHaveBeenCalled()
  })
})
