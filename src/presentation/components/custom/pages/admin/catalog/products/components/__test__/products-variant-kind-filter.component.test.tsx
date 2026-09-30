import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const grid = vi.hoisted(() => ({
  activeVariantKindFilter: undefined as string | undefined,
  applyProductsFilter: vi.fn<(patch: { variantKind?: string | undefined }) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => ({
    activeVariantKindFilter: grid.activeVariantKindFilter,
    applyProductsFilter: grid.applyProductsFilter,
  }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_VARIANT_KIND } from "~/src/modules/product/product.constants"

import { ProductsVariantKindFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-variant-kind-filter"

const trigger = () => screen.getByRole("combobox", { name: "Filter by variants" })

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
  grid.activeVariantKindFilter = undefined
})

afterEach(() => {
  cleanup()
})

describe("ProductsVariantKindFilter", () => {
  it("shows that no variant filter is applied", () => {
    renderWithProviders(<ProductsVariantKindFilter />)

    expect(trigger()).toHaveTextContent("All variant types")
  })

  it("offers both variant kinds beside the unfiltered choice", async () => {
    renderWithProviders(<ProductsVariantKindFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All variant types", "Single variant", "Multiple variants"])
  })

  it("reflects the filter the grid already holds", () => {
    grid.activeVariantKindFilter = PRODUCT_VARIANT_KIND.MULTI

    renderWithProviders(<ProductsVariantKindFilter />)

    expect(trigger()).toHaveTextContent("Multiple variants")
  })

  it("asks the grid to keep only single-variant products", async () => {
    renderWithProviders(<ProductsVariantKindFilter />)

    await pick("Single variant")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ variantKind: PRODUCT_VARIANT_KIND.SINGLE })
  })

  it("asks the grid to keep only multi-variant products", async () => {
    renderWithProviders(<ProductsVariantKindFilter />)

    await pick("Multiple variants")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ variantKind: PRODUCT_VARIANT_KIND.MULTI })
  })

  it("clears the filter when all variant types is chosen", async () => {
    grid.activeVariantKindFilter = PRODUCT_VARIANT_KIND.SINGLE

    renderWithProviders(<ProductsVariantKindFilter />)
    await pick("All variant types")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ variantKind: undefined })
  })
})
