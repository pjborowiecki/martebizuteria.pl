import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { CollectionsStats } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-stats"

import { CollectionsGridHarness, type CollectionsTable, collectionRow } from "./collections-grid-harness"

const STATS_KEY = ["admin", "collections", "stats"] as const

const { fetchStats } = vi.hoisted(() => ({ fetchStats: vi.fn<() => Promise<ProductCollection["stats"]>>() }))

vi.mock("~/src/modules/product-collection/use-cases/get-collection-stats", () => ({
  getCollectionStatsQuery: () => ({ queryFn: fetchStats, queryKey: STATS_KEY }),
}))

const STATS: ProductCollection["stats"] = { active: 6, avgProducts: 2.5, draft: 2, total: 8 }

const ROWS = [
  collectionRow({ handle: "new-arrivals", id: "collection-1", status: "active" }),
  collectionRow({ handle: "sale", id: "collection-2", status: "draft" }),
]

const renderStats = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(STATS_KEY, STATS)
  const seen: { queryClient: QueryClient; table?: CollectionsTable } = { queryClient }

  renderWithProviders(
    <Suspense fallback={<span>loading</span>}>
      <CollectionsGridHarness rows={ROWS}>
        {(table) => {
          seen.table = table

          return <CollectionsStats />
        }}
      </CollectionsGridHarness>
    </Suspense>,
    { queryClient },
  )

  return seen
}

describe("CollectionsStats", () => {
  beforeEach(() => {
    fetchStats.mockReset()
    fetchStats.mockResolvedValue(STATS)
  })

  afterEach(() => {
    cleanup()
  })

  it("shows one card per figure with its translated label", async () => {
    renderStats()

    expect(await screen.findByText("Total Collections")).toBeInTheDocument()
    expect(screen.getByText("Active Collections")).toBeInTheDocument()
    expect(screen.getByText("Drafts")).toBeInTheDocument()
    expect(screen.getByText("Avg. Products/Collection")).toBeInTheDocument()
  })

  it("formats the counts and the average", async () => {
    renderStats()

    expect(await screen.findByText("8")).toBeInTheDocument()
    expect(screen.getByText("6")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText((2.5).toLocaleString(undefined, { maximumFractionDigits: 1 }))).toBeInTheDocument()
  })

  it("captions the status cards with their share of the total", async () => {
    renderStats()

    expect(await screen.findByText("75% of total")).toBeInTheDocument()
    expect(screen.getByText("25% of total")).toBeInTheDocument()
  })

  it("captions the average with the products it covers", async () => {
    renderStats()

    expect(await screen.findByText("~20 products assigned")).toBeInTheDocument()
  })

  it("filters the table to drafts when the draft card is pressed", async () => {
    const seen = renderStats()

    await userEvent.click(await screen.findByRole("button", { name: /Drafts/u }))

    expect(seen.table?.getColumn("status")?.getFilterValue()).toBe("draft")
    expect(seen.table?.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["collection-2"])
  })

  it("clears the filter again from the total card", async () => {
    const seen = renderStats()

    await userEvent.click(await screen.findByRole("button", { name: /Drafts/u }))
    await userEvent.click(screen.getByRole("button", { name: /Total Collections/u }))

    expect(seen.table?.getColumn("status")?.getFilterValue()).toBeUndefined()
    expect(seen.table?.getFilteredRowModel().rows).toHaveLength(ROWS.length)
  })

  it("sends the table back to the first page whenever the filter changes", async () => {
    const seen = renderStats()
    seen.table?.setPageIndex(3)

    await userEvent.click(await screen.findByRole("button", { name: /Active Collections/u }))

    expect(seen.table?.atoms.pagination.get().pageIndex).toBe(0)
  })

  it("hides stale captions and blocks status changes until a background refresh completes", async () => {
    const deferred = Promise.withResolvers<ProductCollection["stats"]>()
    const { queryClient, table } = renderStats()
    const activeCard = await screen.findByRole("button", { name: /Active Collections/u })
    expect(screen.getByText("75% of total")).toBeInTheDocument()
    fetchStats.mockReturnValueOnce(deferred.promise)

    act(() => {
      void queryClient.invalidateQueries({ queryKey: STATS_KEY })
    })
    await waitFor(() => {
      expect(activeCard).toBeDisabled()
    })
    expect(activeCard).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("75% of total")).not.toBeInTheDocument()
    expect(screen.queryByText("~20 products assigned")).not.toBeInTheDocument()
    await userEvent.click(activeCard)
    expect(table?.getColumn("status")?.getFilterValue()).toBeUndefined()

    await act(async () => {
      deferred.resolve({ active: 3, avgProducts: 2, draft: 3, total: 6 })
      await deferred.promise
    })
    await waitFor(() => {
      expect(activeCard).toBeEnabled()
    })
    expect(activeCard).toHaveAttribute("aria-busy", "false")
    expect(screen.getAllByText("50% of total")).toHaveLength(2)
    expect(screen.getByText("~12 products assigned")).toBeInTheDocument()
  })

  it("marks the total card as active while no status filter is set", async () => {
    renderStats()

    expect(await screen.findByRole("button", { name: /Total Collections/u })).toHaveAttribute("aria-pressed", "true")
  })
})
