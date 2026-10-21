import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontCatalogScope, type StorefrontProductsSearch } from "~/src/modules/storefront-search/storefront-search.zod"

import { ProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-page"

const results = vi.hoisted(() => ({
  pending: new Map<string, PromiseWithResolvers<unknown>>(),
}))

vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  getCategoriesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["categories"] }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["collections"] }),
}))
vi.mock("~/src/modules/product/use-cases/get-storefront-products-page", () => ({
  getStorefrontProductsPageQuery: (search: StorefrontProductsSearch, scope?: StorefrontCatalogScope) => ({
    getNextPageParam: () => null,
    initialPageParam: 1,
    queryFn: () => {
      const pending = Promise.withResolvers<unknown>()
      results.pending.set(JSON.stringify(search), pending)

      return pending.promise
    },
    queryKey: ["storefront-products", scope ?? null, search],
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog-grid", () => ({
  ProductsCatalogGrid: ({ products, updating }: { readonly products: readonly { readonly id: string }[]; readonly updating: boolean }) => (
    <section aria-label="results" data-updating={String(updating)}>
      {products.map((product) => (
        <span key={product.id}>{product.id}</span>
      ))}
    </section>
  ),
}))

const HEADER = { eyebrow: "Catalog", title: "All jewellery" }

const productsPage = (id: string) => ({
  pageParams: [1],
  pages: [{ items: [{ handle: id, id, subtitles: null, thumbnail: null, titles: {} }], total: 1 }],
})

const catalogPage = (search: StorefrontProductsSearch) => (
  <Suspense fallback={<span>page blanked</span>}>
    <ProductsCatalogPage
      header={HEADER}
      i18nNamespace="pages.products"
      onSearchChange={vi.fn<(patch: Partial<StorefrontProductsSearch>) => void>()}
      search={search}
    />
  </Suspense>
)

const renderCatalog = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(["categories"], [])
  queryClient.setQueryData(["collections"], [])
  queryClient.setQueryData(["storefront-products", null, {}], productsPage("ring-before"))
  const { rerender, router } = renderWithProviders(catalogPage({}), { queryClient })

  return {
    applySearch: (search: StorefrontProductsSearch) => {
      rerender(
        <TestProviders queryClient={queryClient} router={router}>
          {catalogPage(search)}
        </TestProviders>,
      )
    },
  }
}

describe("ProductsCatalogPage while a filter change loads", () => {
  afterEach(() => {
    cleanup()
    results.pending.clear()
  })

  it("keeps the current products and the filters on screen, marked as updating, instead of blanking the page", async () => {
    const { applySearch } = renderCatalog()
    expect(await screen.findByText("ring-before")).toBeInTheDocument()

    applySearch({ sort: "price_asc" })

    await waitFor(() => {
      expect(results.pending.has(JSON.stringify({ sort: "price_asc" }))).toBe(true)
    })
    expect(screen.queryByText("page blanked")).not.toBeInTheDocument()
    expect(screen.getByText("ring-before")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "results" })).toHaveAttribute("data-updating", "true")
    expect(screen.getByRole("heading", { level: 1, name: "All jewellery" })).toBeInTheDocument()
  })

  it("shows the new products once they arrive and stops marking the results as updating", async () => {
    const { applySearch } = renderCatalog()
    expect(await screen.findByText("ring-before")).toBeInTheDocument()

    applySearch({ sort: "price_asc" })
    await waitFor(() => {
      expect(results.pending.has(JSON.stringify({ sort: "price_asc" }))).toBe(true)
    })
    results.pending.get(JSON.stringify({ sort: "price_asc" }))?.resolve(productsPage("ring-after").pages[0])

    expect(await screen.findByText("ring-after")).toBeInTheDocument()
    expect(screen.queryByText("ring-before")).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "results" })).toHaveAttribute("data-updating", "false")
  })
})
