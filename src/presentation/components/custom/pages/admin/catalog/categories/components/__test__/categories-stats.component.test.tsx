import { Suspense } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const stats = vi.hoisted(() => ({
  current: { active: 6, avgProducts: 2.5, draft: 2, total: 8 },
  query: vi.fn<() => Promise<{ active: number; avgProducts: number; draft: number; total: number }>>(),
}))

const grid = vi.hoisted(() => {
  const column: { current: unknown } = { current: undefined }

  return { column, setFilterValue: vi.fn<(value: unknown) => void>(), setPageIndex: vi.fn<(index: number) => void>() }
})

vi.mock("~/src/modules/product-category/use-cases/get-category-stats", () => ({
  getCategoryStatsQuery: () => ({ queryFn: stats.query, queryKey: ["admin", "categories", "stats"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid", () => ({
  categoriesDataGrid: {
    useDataGrid: () => ({
      table: {
        getColumn: () => ({ getFilterValue: () => grid.column.current, setFilterValue: grid.setFilterValue }),
        setPageIndex: grid.setPageIndex,
      },
    }),
  },
}))

import { CategoriesStats } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-stats"

const renderStats = async () => {
  const view = renderWithProviders(
    <Suspense fallback="loading stats">
      <CategoriesStats />
    </Suspense>,
  )
  await screen.findByText("Total Categories")

  return view
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  grid.column.current = undefined
  stats.current = { active: 6, avgProducts: 2.5, draft: 2, total: 8 }
  stats.query.mockResolvedValue(stats.current)
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

describe("CategoriesStats", () => {
  it("renders one card per configured statistic", async () => {
    await renderStats()

    expect(screen.getByText("Total Categories")).toBeInTheDocument()
    expect(screen.getByText("Active Categories")).toBeInTheDocument()
    expect(screen.getByText("Drafts")).toBeInTheDocument()
    expect(screen.getByText("Avg. Products/Category")).toBeInTheDocument()
  })

  it("formats each statistic value", async () => {
    await renderStats()

    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText("2.5")).toBeInTheDocument()
  })

  it("captions the active and draft shares of the total", async () => {
    await renderStats()

    expect(screen.getByText("75% of total")).toBeInTheDocument()
    expect(screen.getByText("25% of total")).toBeInTheDocument()
  })

  it("captions the average with the assigned product estimate", async () => {
    await renderStats()

    expect(screen.getByText("~20 products assigned")).toBeInTheDocument()
  })

  it("filters the table by status and returns to the first page", async () => {
    await renderStats()

    await userEvent.click(screen.getByText("Drafts"))

    expect(grid.setFilterValue).toHaveBeenCalledWith("draft")
    expect(grid.setPageIndex).toHaveBeenCalledWith(0)
  })

  it("clears the status filter from the total card", async () => {
    grid.column.current = "draft"

    await renderStats()
    await userEvent.click(screen.getByText("Total Categories"))

    expect(grid.setFilterValue).toHaveBeenCalledWith(undefined)
  })

  it("marks the card matching the active filter as pressed", async () => {
    grid.column.current = "active"

    await renderStats()

    const pressed = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")

    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveTextContent("Active Categories")
  })

  it("hides stale captions and disables filters until refreshed statistics arrive", async () => {
    const { queryClient } = await renderStats()
    const pending = Promise.withResolvers<typeof stats.current>()
    stats.query.mockReturnValueOnce(pending.promise)

    act(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "categories", "stats"] })
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Active Categories" })).toBeDisabled()
    })
    expect(screen.queryByText("75% of total")).not.toBeInTheDocument()

    await act(async () => {
      pending.resolve({ active: 4, avgProducts: 2, draft: 4, total: 8 })
      await pending.promise
    })

    expect(await screen.findAllByText("50% of total")).toHaveLength(2)
    expect(screen.getByRole("button", { name: /Active Categories/u })).toBeEnabled()
  })
})
