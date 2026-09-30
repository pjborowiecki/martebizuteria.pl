import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontProductsSearch } from "~/src/modules/product/product.storefront-catalog"

import { ProductsCatalogFilters } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-filters"

import { categoryFixture, collectionFixture } from "./catalog-filter-fixtures"

const CATEGORIES = [
  categoryFixture("rings", "Rings", [categoryFixture("silver-rings", "Silver rings")]),
  categoryFixture("necklaces", "Necklaces"),
]

const COLLECTIONS = [collectionFixture("new", "New arrivals"), collectionFixture("sale", "Sale")]

const EMPTY_SEARCH: StorefrontProductsSearch = {}

const renderFilters = (
  search = EMPTY_SEARCH,
  visibility: { readonly showCategoryFilter?: boolean; readonly showCollectionFilter?: boolean } = {},
) => {
  const onSearchChange = vi.fn<(patch: Partial<StorefrontProductsSearch>) => void>()

  renderWithProviders(
    <ProductsCatalogFilters
      categories={CATEGORIES}
      collections={COLLECTIONS}
      locale="en-US"
      onSearchChange={onSearchChange}
      search={search}
      {...visibility}
    />,
  )

  return onSearchChange
}

const choice = (name: string) => screen.getByRole("button", { name })

describe("ProductsCatalogFilters sorting", () => {
  afterEach(() => {
    cleanup()
  })

  it("offers every sort order", () => {
    renderFilters()

    expect(screen.getByRole("heading", { name: "Sort by" })).toBeInTheDocument()
    for (const label of ["Featured", "Newest", "Price: low to high", "Price: high to low"]) {
      expect(choice(label)).toBeInTheDocument()
    }
  })

  it("caps indentation for deeply nested category branches", () => {
    const fourthLevel = categoryFixture("four", "Four", [categoryFixture("five", "Five")])
    const thirdLevel = categoryFixture("three", "Three", [fourthLevel])
    const categories = [categoryFixture("one", "One", [categoryFixture("two", "Two", [thirdLevel])])]
    renderWithProviders(
      <ProductsCatalogFilters categories={categories} collections={[]} locale="en-US" onSearchChange={vi.fn<() => void>()} search={{}} />,
    )

    expect(screen.getByText("Five")).toHaveClass("ps-12")
    expect(choice("Five")).toBeEnabled()
  })

  it("treats the featured order as the default", () => {
    renderFilters()

    expect(choice("Featured").className).toContain("border-foreground")
  })

  it("patches the search with the chosen order", async () => {
    const onSearchChange = renderFilters()

    await userEvent.click(choice("Price: low to high"))

    expect(onSearchChange).toHaveBeenCalledWith({ sort: "price_asc" })
  })

  it("drops the sort from the search when the default order is chosen again", async () => {
    const onSearchChange = renderFilters({ sort: "newest" })

    await userEvent.click(choice("Featured"))

    expect(onSearchChange).toHaveBeenCalledWith({ sort: undefined })
  })
})

describe("ProductsCatalogFilters categories", () => {
  afterEach(() => {
    cleanup()
  })

  it("lists every category of the tree beside an all option", () => {
    renderFilters()

    expect(choice("All categories")).toBeInTheDocument()
    expect(choice("Rings")).toBeInTheDocument()
    expect(choice("Silver rings")).toBeInTheDocument()
    expect(choice("Necklaces")).toBeInTheDocument()
  })

  it("patches the search with the category handle", async () => {
    const onSearchChange = renderFilters()

    await userEvent.click(choice("Silver rings"))

    expect(onSearchChange).toHaveBeenCalledWith({ category: "silver-rings-handle" })
  })

  it("clears the category again through the all option", async () => {
    const onSearchChange = renderFilters({ category: "rings-handle" })

    await userEvent.click(choice("All categories"))

    expect(onSearchChange).toHaveBeenCalledWith({ category: undefined })
  })

  it("marks the category from the search as active", () => {
    renderFilters({ category: "rings-handle" })

    expect(choice("Rings").className).toContain("border-foreground")
    expect(choice("All categories").className).toContain("border-transparent")
  })

  it("hides the whole section on a category page", () => {
    renderFilters(EMPTY_SEARCH, { showCategoryFilter: false })

    expect(screen.queryByRole("heading", { name: "Category" })).toBeNull()
    expect(screen.queryByRole("button", { name: "All categories" })).toBeNull()
  })
})

describe("ProductsCatalogFilters collections", () => {
  afterEach(() => {
    cleanup()
  })

  it("lists every collection beside an all option", () => {
    renderFilters()

    expect(choice("All collections")).toBeInTheDocument()
    expect(choice("New arrivals")).toBeInTheDocument()
    expect(choice("Sale")).toBeInTheDocument()
  })

  it("patches the search with the collection handle", async () => {
    const onSearchChange = renderFilters()

    await userEvent.click(choice("Sale"))

    expect(onSearchChange).toHaveBeenCalledWith({ collection: "sale-handle" })
  })

  it("clears the collection again through the all option", async () => {
    const onSearchChange = renderFilters({ collection: "sale-handle" })

    await userEvent.click(choice("All collections"))

    expect(onSearchChange).toHaveBeenCalledWith({ collection: undefined })
  })

  it("hides the whole section on a collection page", () => {
    renderFilters(EMPTY_SEARCH, { showCollectionFilter: false })

    expect(screen.queryByRole("heading", { name: "Collection" })).toBeNull()
    expect(screen.queryByRole("button", { name: "All collections" })).toBeNull()
  })
})

describe("ProductsCatalogFilters price", () => {
  afterEach(() => {
    cleanup()
  })

  it("always offers the price bounds", () => {
    renderFilters()

    expect(screen.getByRole("spinbutton", { name: "From" })).toBeInTheDocument()
    expect(screen.getByRole("spinbutton", { name: "To" })).toBeInTheDocument()
  })
})
