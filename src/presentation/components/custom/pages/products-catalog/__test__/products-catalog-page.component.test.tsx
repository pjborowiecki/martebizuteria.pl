import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontCatalogScope, type StorefrontProductsSearch } from "~/src/modules/product/product.storefront-catalog"

import { ProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-page"

import { categoryFixture, collectionFixture } from "./catalog-filter-fixtures"

const keys = vi.hoisted(() => ({
  categories: ["categories"] as const,
  collections: ["collections"] as const,
  products: ["storefront-products"] as const,
}))

vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  getCategoriesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: keys.categories }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: keys.collections }),
}))
vi.mock("~/src/modules/product/use-cases/get-storefront-products-page", () => ({
  getStorefrontProductsPageQuery: () => ({
    getNextPageParam: () => null,
    initialPageParam: 1,
    queryFn: () => Promise.resolve({ items: [], total: 0 }),
    queryKey: keys.products,
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog-grid", () => ({
  ProductsCatalogGrid: ({
    filtersActive,
    infiniteScrollEnabled,
    onClearFilters,
    products,
    total,
  }: {
    readonly filtersActive: boolean
    readonly infiniteScrollEnabled: boolean
    readonly onClearFilters: () => void
    readonly products: readonly { readonly id: string }[]
    readonly total: number
  }) => (
    <section
      data-filters-active={String(filtersActive)}
      data-infinite-scroll={String(infiniteScrollEnabled)}
      data-products={String(products.length)}
      data-total={String(total)}
    >
      <button onClick={onClearFilters} type="button">
        clear from grid
      </button>
    </section>
  ),
}))

const CATEGORIES = [categoryFixture("rings", "Rings")]

const COLLECTIONS = [collectionFixture("new", "New arrivals")]

const HEADER = { eyebrow: "Catalog", title: "All jewellery" }

const PRODUCT_PAGE = { items: [{ handle: "ring-0", id: "product-0", subtitles: null, thumbnail: null, titles: {} }], total: 12 }

const renderPage = (
  overrides: {
    readonly pages?: readonly (typeof PRODUCT_PAGE)[]
    readonly scope?: StorefrontCatalogScope
    readonly search?: StorefrontProductsSearch
  } = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(keys.categories, CATEGORIES)
  queryClient.setQueryData(keys.collections, COLLECTIONS)
  const pages = overrides.pages ?? [PRODUCT_PAGE]
  queryClient.setQueryData(keys.products, { pageParams: pages.map((_page, index) => index + 1), pages })
  const onSearchChange = vi.fn<(patch: Partial<StorefrontProductsSearch>, options?: { clearAll?: boolean }) => void>()

  renderWithProviders(
    <Suspense fallback={<span>loading</span>}>
      <ProductsCatalogPage
        header={HEADER}
        i18nNamespace="pages.products"
        onSearchChange={onSearchChange}
        search={overrides.search ?? {}}
        {...(overrides.scope === undefined ? {} : { scope: overrides.scope })}
      />
    </Suspense>,
    { queryClient },
  )

  return onSearchChange
}

const grid = () => {
  const section = document.querySelector("[data-total]")
  if (!(section instanceof HTMLElement)) {
    throw new Error("expected the grid to be rendered")
  }

  return section
}

describe("ProductsCatalogPage header", () => {
  afterEach(() => {
    cleanup()
  })

  it("heads the catalogue with the eyebrow and the title alone", async () => {
    renderPage()

    const heading = await screen.findByRole("heading", { level: 1, name: "All jewellery" })

    expect(screen.getByText("Catalog")).toBeInTheDocument()
    expect(heading.parentElement?.tagName).toBe("HEADER")
    expect(heading.parentElement?.children).toHaveLength(2)
  })

  it("offers to clear the search while a query is active", async () => {
    const onSearchChange = renderPage({ search: { q: "pierścionek" } })

    await userEvent.click(await screen.findByRole("button", { name: "Clear search" }))

    expect(onSearchChange).toHaveBeenCalledExactlyOnceWith({ q: undefined })
  })
})

describe("ProductsCatalogPage filters", () => {
  afterEach(() => {
    cleanup()
  })

  it("offers both the category and the collection filter on the full catalog", async () => {
    renderPage()

    expect(await screen.findByRole("button", { name: "All categories" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "All collections" })).toBeInTheDocument()
  })

  it("hides the category filter on a category page", async () => {
    renderPage({ scope: { categoryHandle: "rings-handle" } })

    expect(await screen.findByRole("button", { name: "All collections" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "All categories" })).toBeNull()
  })

  it("hides the collection filter on a collection page", async () => {
    renderPage({ scope: { collectionHandle: "new-handle" } })

    expect(await screen.findByRole("button", { name: "All categories" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "All collections" })).toBeNull()
  })

  it("counts the applied filters on the mobile trigger", async () => {
    renderPage({ search: { maxPrice: 900, q: "ring" } })

    const trigger = await screen.findByRole("button", { name: /Filters/u })

    expect(trigger.textContent).toBe("Filters2")
  })

  it("shows no badge while nothing is filtered", async () => {
    renderPage()

    const trigger = await screen.findByRole("button", { name: "Filters" })

    expect(trigger.textContent).toBe("Filters")
  })
})

describe("ProductsCatalogPage results", () => {
  it("shows zero products for an infinite query restored without any pages", () => {
    renderPage({ pages: [] })

    expect(grid()).toHaveAttribute("data-total", "0")
    expect(grid()).toHaveAttribute("data-products", "0")
  })

  afterEach(() => {
    cleanup()
  })

  it("hands the grid the flattened pages and the reported total", async () => {
    renderPage()

    await screen.findByRole("heading", { level: 1, name: "All jewellery" })

    expect(grid().dataset["products"]).toBe("1")
    expect(grid().dataset["total"]).toBe("12")
  })

  it("keeps infinite scroll on while nothing is filtered", async () => {
    renderPage()

    await screen.findByRole("heading", { level: 1, name: "All jewellery" })

    expect(grid().dataset["filtersActive"]).toBe("false")
    expect(grid().dataset["infiniteScroll"]).toBe("true")
  })

  it("turns infinite scroll off once a filter is applied", async () => {
    renderPage({ search: { q: "ring" } })

    await screen.findByRole("heading", { level: 1, name: "All jewellery" })

    expect(grid().dataset["filtersActive"]).toBe("true")
    expect(grid().dataset["infiniteScroll"]).toBe("false")
  })

  it("treats a scoped page as filtered only by its own facets", async () => {
    renderPage({ scope: { categoryHandle: "rings-handle" } })

    await screen.findByRole("heading", { level: 1, name: "All jewellery" })

    expect(grid().dataset["filtersActive"]).toBe("false")
  })

  it("asks to clear every filter at once", async () => {
    const onSearchChange = renderPage({ search: { q: "ring" } })

    await userEvent.click(await screen.findByRole("button", { name: "clear from grid" }))

    expect(onSearchChange).toHaveBeenCalledWith({}, { clearAll: true })
  })

  it("opens the mobile filter panel from its trigger", async () => {
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Filters" }))

    expect(await screen.findByText("Refine your selection")).toBeInTheDocument()
  })

  it("closes the mobile filter panel from the show results button", async () => {
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Filters" }))
    await userEvent.click(await screen.findByRole("button", { name: "Show results" }))

    await waitFor(() => {
      expect(screen.queryByText("Refine your selection")).toBeNull()
    })
  })
})
