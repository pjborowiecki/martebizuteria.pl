import { Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface AdminCollectionRow {
  id: string
  titles: Record<string, string>
}

const grid = vi.hoisted(() => ({
  activeCollectionFilter: undefined as string | undefined,
  applyProductsFilter: vi.fn<(patch: { collectionId?: string | undefined }) => void>(),
  collections: [] as AdminCollectionRow[],
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => ({
    activeCollectionFilter: grid.activeCollectionFilter,
    applyProductsFilter: grid.applyProductsFilter,
  }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({
  getAdminCollectionsQuery: () => ({
    queryFn: () => Promise.resolve(grid.collections),
    queryKey: ["product-collection", "admin-list"],
  }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductsCollectionFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-collection-filter"

const trigger = () => screen.getByRole("combobox", { name: "Filter by collection" })

const renderFilter = () => {
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <ProductsCollectionFilter />
    </Suspense>,
  )

  return screen.findByRole("combobox", { name: "Filter by collection" })
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
  grid.activeCollectionFilter = undefined
  grid.collections = [
    { id: "col-new", titles: { "en-US": "New arrivals", "pl-PL": "Nowości" } },
    { id: "col-gold", titles: { "en-US": "Gold edit", "pl-PL": "Złota edycja" } },
  ]
})

afterEach(() => {
  cleanup()
})

describe("ProductsCollectionFilter", () => {
  it("shows that no collection filter is applied", async () => {
    await renderFilter()

    expect(trigger()).toHaveTextContent("All collections")
  })

  it("lists every admin collection by its English title", async () => {
    await renderFilter()
    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All collections", "New arrivals", "Gold edit"])
  })

  it("reflects the collection the grid already filters by", async () => {
    grid.activeCollectionFilter = "col-gold"
    await renderFilter()

    expect(trigger()).toHaveTextContent("Gold edit")
  })

  it("asks the grid to narrow to the chosen collection", async () => {
    await renderFilter()
    await pick("New arrivals")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ collectionId: "col-new" })
  })

  it("clears the filter when all collections is chosen", async () => {
    grid.activeCollectionFilter = "col-new"
    await renderFilter()
    await pick("All collections")

    expect(grid.applyProductsFilter).toHaveBeenCalledWith({ collectionId: undefined })
  })

  it("offers only the unfiltered choice when the catalog has no collections", async () => {
    grid.collections = []
    await renderFilter()
    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All collections"])
  })

  it("falls back to another locale title when the English one is blank", async () => {
    grid.collections = [{ id: "col-pl", titles: { "en-US": "", "pl-PL": "Tylko po polsku" } }]
    await renderFilter()

    expect(trigger()).toHaveTextContent("All collections")
    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All collections", "Tylko po polsku"])
  })
})
