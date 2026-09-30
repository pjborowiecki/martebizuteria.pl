import { Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type AdminCustomerStatFilter } from "~/src/modules/user/user.constants"

const stats = vi.hoisted(() => ({
  current: { averageLtv: 45_000, averageProductsPerOrder: 2.25, returningRate: 37, total: 1234 },
}))

const grid = vi.hoisted(() => {
  const activeFilter: { current: AdminCustomerStatFilter | undefined } = { current: undefined }

  return { activeFilter, applyFilter: vi.fn<(filter?: AdminCustomerStatFilter) => void>() }
})

vi.mock("~/src/modules/user/use-cases/get-admin-customer-stats", () => ({
  getAdminCustomerStatsQuery: () => ({
    queryFn: () => Promise.resolve(stats.current),
    queryKey: ["admin", "customers", "stats"],
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-data-grid", () => ({
  useCustomersDataGridContext: () => ({
    activeStatFilter: grid.activeFilter.current,
    applyCustomerStatFilter: grid.applyFilter,
  }),
}))

import { CustomersStats } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-stats"

const renderStats = async (): Promise<void> => {
  renderWithProviders(
    <Suspense fallback="loading customer stats">
      <CustomersStats />
    </Suspense>,
  )
  await screen.findByText("Total Customers")
}

beforeEach(() => {
  vi.clearAllMocks()
  grid.activeFilter.current = undefined
  stats.current = { averageLtv: 45_000, averageProductsPerOrder: 2.25, returningRate: 37, total: 1234 }
})

afterEach(() => {
  cleanup()
})

describe("CustomersStats", () => {
  it("renders one card per configured statistic", async () => {
    await renderStats()

    expect(screen.getByText("Total Customers")).toBeInTheDocument()
    expect(screen.getByText("Returning customers")).toBeInTheDocument()
    expect(screen.getByText("Average spend per customer")).toBeInTheDocument()
    expect(screen.getByText("Average units per order")).toBeInTheDocument()
  })

  it("groups the customer head count with thousands separators", async () => {
    await renderStats()

    expect(screen.getByText("1,234")).toBeInTheDocument()
  })

  it("shows the returning share as a percentage", async () => {
    await renderStats()

    expect(screen.getByText("37%")).toBeInTheDocument()
  })

  it("shows the average lifetime value as money", async () => {
    await renderStats()

    expect(screen.getByText("PLN 450.00")).toBeInTheDocument()
  })

  it("rounds the average units per order to one decimal", async () => {
    await renderStats()

    expect(screen.getByText("2.3")).toBeInTheDocument()
  })

  it("captions only the statistics that need explaining", async () => {
    await renderStats()

    expect(screen.getByText("Customers with at least one order")).toBeInTheDocument()
    expect(screen.getByText("Share of customers with 2+ orders")).toBeInTheDocument()
  })

  it("applies the returning filter of the card that was clicked", async () => {
    await renderStats()

    await userEvent.click(screen.getByText("Returning customers"))

    expect(grid.applyFilter).toHaveBeenCalledWith("returning")
  })

  it("clears the filter from the total card", async () => {
    grid.activeFilter.current = "returning"

    await renderStats()
    await userEvent.click(screen.getByText("Total Customers"))

    expect(grid.applyFilter).toHaveBeenCalledWith()
  })

  it("marks the card matching the active filter as pressed", async () => {
    grid.activeFilter.current = "returning"

    await renderStats()

    const pressed = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")

    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveTextContent("Returning customers")
  })

  it("offers no filtering on the statistics that are not filterable", async () => {
    await renderStats()

    expect(screen.getAllByRole("button")).toHaveLength(2)
  })
})
