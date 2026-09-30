import { Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttributeStatFilter } from "~/src/modules/product-attribute/product-attribute.constants"

const stats = vi.hoisted(() => ({ current: { inUse: 3, total: 4, unused: 1, withChoices: 2 } }))

const grid = vi.hoisted(() => {
  const activeFilter: { current: ProductAttributeStatFilter | undefined } = { current: undefined }

  return { activeFilter, applyFilter: vi.fn<(filter?: ProductAttributeStatFilter) => void>() }
})

vi.mock("~/src/modules/product-attribute/use-cases/get-product-attribute-stats", () => ({
  getProductAttributeStatsQuery: () => ({ queryFn: () => Promise.resolve(stats.current), queryKey: ["admin", "attributes", "stats"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid", () => ({
  useAttributesDataGridContext: () => ({
    activeStatFilter: grid.activeFilter.current,
    applyAttributeStatFilter: grid.applyFilter,
  }),
}))

import { AttributesStats } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-stats"

const renderStats = async (): Promise<void> => {
  renderWithProviders(
    <Suspense fallback="loading stats">
      <AttributesStats />
    </Suspense>,
  )
  await screen.findByText("All attributes")
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  grid.activeFilter.current = undefined
  stats.current = { inUse: 3, total: 4, unused: 1, withChoices: 2 }
})

describe("AttributesStats", () => {
  it("renders one card per configured statistic", async () => {
    await renderStats()

    expect(screen.getByText("All attributes")).toBeInTheDocument()
    expect(screen.getByText("Used on products")).toBeInTheDocument()
    expect(screen.getByText("Unused")).toBeInTheDocument()
    expect(screen.getByText("With choice lists")).toBeInTheDocument()
  })

  it("captions each share of all attributes", async () => {
    await renderStats()

    expect(screen.getByText("75% of all")).toBeInTheDocument()
    expect(screen.getByText("25% of all")).toBeInTheDocument()
    expect(screen.getByText("50% of all")).toBeInTheDocument()
  })

  it("applies the stat filter of the card that was clicked", async () => {
    await renderStats()

    await userEvent.click(screen.getByText("Unused"))

    expect(grid.applyFilter).toHaveBeenCalledWith("unused")
  })

  it("clears the stat filter from the total card", async () => {
    grid.activeFilter.current = "unused"

    await renderStats()
    await userEvent.click(screen.getByText("All attributes"))

    expect(grid.applyFilter).toHaveBeenCalledWith()
  })

  it("marks the card matching the active filter as pressed", async () => {
    grid.activeFilter.current = "choice"

    await renderStats()

    const pressed = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")

    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveTextContent("With choice lists")
  })
})
