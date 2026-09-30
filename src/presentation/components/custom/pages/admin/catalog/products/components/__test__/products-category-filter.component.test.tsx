import { Suspense } from "react"

import { queryOptions } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface CategoryOption {
  readonly id: string
  readonly titles: Record<string, string>
}

const grid = vi.hoisted(() => ({
  activeCategoryFilter: undefined as string | undefined,
  applyProductsFilter: vi.fn<(patch: { categoryId: string | undefined }) => void>(),
}))

const catalog = vi.hoisted(() => ({ categories: [] as CategoryOption[] }))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => ({
    activeCategoryFilter: grid.activeCategoryFilter,
    applyProductsFilter: grid.applyProductsFilter,
  }),
}))

vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () =>
    queryOptions({ queryFn: () => Promise.resolve(catalog.categories), queryKey: ["admin", "categories", "all"] as const }),
}))

import { ProductsCategoryFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-category-filter"

const trigger = (): HTMLElement => screen.getByRole("combobox", { name: "Filter by category" })

const renderFilter = () => {
  renderWithProviders(
    <Suspense fallback={<output>loading</output>}>
      <ProductsCategoryFilter />
    </Suspense>,
  )

  return screen.findByRole("combobox", { name: "Filter by category" })
}

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
  grid.activeCategoryFilter = undefined
  catalog.categories = [
    { id: "cat-rings", titles: { "en-US": "Rings", "pl-PL": "Pierscionki" } },
    { id: "cat-necklaces", titles: { "en-US": "Necklaces", "pl-PL": "Naszyjniki" } },
  ]
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(() => {
  cleanup()
})

describe("ProductsCategoryFilter", () => {
  it("starts on every category", async () => {
    await renderFilter()

    expect(trigger()).toHaveTextContent("All categories")
  })

  it("shows the title of the category already filtered on, in the admin locale", async () => {
    grid.activeCategoryFilter = "cat-necklaces"
    await renderFilter()

    expect(trigger()).toHaveTextContent("Necklaces")
  })

  it("offers the reset choice ahead of every category from the catalog", async () => {
    await renderFilter()
    await userEvent.click(trigger())

    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All categories", "Rings", "Necklaces"])
  })

  it("patches the list filter with the chosen category id", async () => {
    await renderFilter()
    await pick("Rings")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ categoryId: "cat-rings" })
  })

  it("clears the category from the list filter when the reset choice is picked", async () => {
    grid.activeCategoryFilter = "cat-rings"
    await renderFilter()
    await pick("All categories")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ categoryId: undefined })
  })

  it("offers only the reset choice when the catalog has no categories", async () => {
    catalog.categories = []
    await renderFilter()
    await userEvent.click(trigger())

    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All categories"])
  })
})
