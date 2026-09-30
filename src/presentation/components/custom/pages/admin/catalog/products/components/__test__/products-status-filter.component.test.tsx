import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const grid = vi.hoisted(() => ({
  activeStatusFilter: undefined as string | undefined,
  applyProductsFilter: vi.fn<(patch: { status?: string | undefined }) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => ({
    activeStatusFilter: grid.activeStatusFilter,
    applyProductsFilter: grid.applyProductsFilter,
  }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"

import { ProductsStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-status-filter"

const trigger = () => screen.getByRole("combobox", { name: "Filter by status" })

const pick = async (label: string) => {
  await userEvent.click(trigger())
  const options = await screen.findAllByRole("option")
  const target = options.find((option) => option.textContent === label)
  if (target === undefined) {
    throw new Error(`No option labelled ${label}`)
  }

  await userEvent.click(target)
}

beforeEach(() => {
  vi.clearAllMocks()
  grid.activeStatusFilter = undefined
})

afterEach(() => {
  cleanup()
})

describe("ProductsStatusFilter", () => {
  it("shows that no status filter is applied", () => {
    renderWithProviders(<ProductsStatusFilter />)

    expect(trigger()).toHaveTextContent("All statuses")
  })

  it("offers every admin status beside the unfiltered choice", async () => {
    renderWithProviders(<ProductsStatusFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All statuses", "Active", "Draft", "Archived"])
  })

  it.each([
    [PRODUCT_STATUS.PUBLISHED, "Active"],
    [PRODUCT_STATUS.DRAFT, "Draft"],
    [PRODUCT_STATUS.ARCHIVED, "Archived"],
  ])("reflects the %s filter the grid already holds", (status, label) => {
    grid.activeStatusFilter = status

    renderWithProviders(<ProductsStatusFilter />)

    expect(trigger()).toHaveTextContent(label)
  })

  it.each([
    ["Active", PRODUCT_STATUS.PUBLISHED],
    ["Draft", PRODUCT_STATUS.DRAFT],
    ["Archived", PRODUCT_STATUS.ARCHIVED],
  ])("asks the grid to keep only %s products", async (label, status) => {
    renderWithProviders(<ProductsStatusFilter />)

    await pick(label)

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ status })
  })

  it("clears the filter when all statuses is chosen", async () => {
    grid.activeStatusFilter = PRODUCT_STATUS.DRAFT

    renderWithProviders(<ProductsStatusFilter />)
    await pick("All statuses")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ status: undefined })
  })

  it("leaves the grid untouched until a choice is made", () => {
    renderWithProviders(<ProductsStatusFilter />)

    expect(grid.applyProductsFilter).not.toHaveBeenCalled()
  })
})
