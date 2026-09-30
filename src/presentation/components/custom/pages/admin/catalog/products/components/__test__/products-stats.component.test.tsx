import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Product } from "~/src/modules/product/product.types"

import { ProductsStats } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-stats"

const STATS_KEY = ["admin", "products", "stats"] as const

const STATS: Product["stats"] = { active: 6, archived: 1, draft: 2, lowStock: 3, total: 8 }

const statsFetch = vi.hoisted(() => vi.fn<() => Promise<Product["stats"]>>())

const context = vi.hoisted(() => ({
  activeInventoryFilter: undefined as string | undefined,
  activeStatusFilter: undefined as string | undefined,
  applyProductsFilter: vi.fn<(patch?: Record<string, unknown>) => void>(),
}))

vi.mock("~/src/modules/product/use-cases/get-product-stats", () => ({
  getProductStatsQuery: () => ({ queryFn: statsFetch, queryKey: STATS_KEY }),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => ({
    activeCategoryFilter: undefined,
    activeCollectionFilter: undefined,
    activeInventoryFilter: context.activeInventoryFilter,
    activeStatusFilter: context.activeStatusFilter,
    activeVariantKindFilter: undefined,
    applyProductsFilter: context.applyProductsFilter,
  }),
}))

const renderStats = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(STATS_KEY, STATS)

  return renderWithProviders(
    <Suspense fallback={<span>loading</span>}>
      <ProductsStats />
    </Suspense>,
    { queryClient },
  )
}

beforeEach(() => {
  statsFetch.mockResolvedValue(STATS)
  context.activeInventoryFilter = undefined
  context.activeStatusFilter = undefined
  context.applyProductsFilter.mockReset()
})

afterEach(cleanup)

describe("ProductsStats", () => {
  it("shows one card per figure with its translated label", async () => {
    renderStats()

    expect(await screen.findByText("Total products")).toBeInTheDocument()
    expect(screen.getByText("Active products")).toBeInTheDocument()
    expect(screen.getByText("Drafts")).toBeInTheDocument()
    expect(screen.getByText("Low stock")).toBeInTheDocument()
  })

  it("prints every figure of the statistics", async () => {
    renderStats()

    expect(await screen.findByText("8")).toBeInTheDocument()
    expect(screen.getByText("6")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("captions the status cards with their share of the catalog", async () => {
    renderStats()

    expect(await screen.findByText("75% of total")).toBeInTheDocument()
    expect(screen.getByText("25% of total")).toBeInTheDocument()
  })

  it("marks the total card as the active view while no filter is set", async () => {
    renderStats()

    const [total] = await screen.findAllByRole("button")
    expect(total).toHaveAttribute("aria-pressed", "true")
  })

  it("clears every filter from the total card", async () => {
    renderStats()

    await userEvent.click(await screen.findByRole("button", { name: /Total products/u }))

    expect(context.applyProductsFilter).toHaveBeenCalledWith()
  })

  it("filters by the published status from the active card", async () => {
    renderStats()

    await userEvent.click(await screen.findByRole("button", { name: /Active products/u }))

    expect(context.applyProductsFilter).toHaveBeenCalledWith({ status: "published" })
  })

  it("drops the status filter again when its card is already active", async () => {
    context.activeStatusFilter = "draft"
    renderStats()

    await userEvent.click(await screen.findByRole("button", { name: /Drafts/u }))

    expect(context.applyProductsFilter).toHaveBeenCalledWith({ status: undefined })
  })

  it("filters by the low inventory level from the low stock card", async () => {
    renderStats()

    await userEvent.click(await screen.findByRole("button", { name: /Low stock/u }))

    expect(context.applyProductsFilter).toHaveBeenCalledWith({ inventoryLevel: "low" })
  })

  it("drops the inventory filter again when its card is already active", async () => {
    context.activeInventoryFilter = "low"
    renderStats()

    await userEvent.click(await screen.findByRole("button", { name: /Low stock/u }))

    expect(context.applyProductsFilter).toHaveBeenCalledWith({ inventoryLevel: undefined })
  })
})

const holdTheNextFetch = () => {
  const pending = Promise.withResolvers<Product["stats"]>()
  statsFetch.mockReturnValue(pending.promise)

  return pending
}

const startRefresh = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: STATS_KEY })
}

const waitForPlaceholders = async () => {
  await waitFor(() => {
    expect(screen.queryByText("8")).toBeNull()
  })
}

describe("ProductsStats while the figures are refreshed", () => {
  it("replaces the stale figures and captions with placeholders", async () => {
    const { container, queryClient } = renderStats()
    await screen.findByText("Total products")
    holdTheNextFetch()

    startRefresh(queryClient)
    await waitForPlaceholders()

    expect(screen.queryByText("75% of total")).toBeNull()
    expect(container.querySelectorAll('[data-slot="skeleton"]')).not.toHaveLength(0)
  })

  it("locks the filter cards until the fresh figures arrive", async () => {
    const { queryClient } = renderStats()
    await screen.findByText("Total products")
    holdTheNextFetch()

    startRefresh(queryClient)
    await waitForPlaceholders()

    const total = screen.getByRole("button", { name: /Total products/u })
    expect(total).toHaveAttribute("aria-busy", "true")
    expect(total).toBeDisabled()
  })

  it("shows the refreshed figures once they arrive", async () => {
    const { queryClient } = renderStats()
    await screen.findByText("Total products")
    const pending = holdTheNextFetch()

    startRefresh(queryClient)
    await waitForPlaceholders()
    pending.resolve({ active: 7, archived: 1, draft: 2, lowStock: 4, total: 9 })

    expect(await screen.findByText("9")).toBeInTheDocument()
    expect(screen.getByText("78% of total")).toBeInTheDocument()
  })
})
