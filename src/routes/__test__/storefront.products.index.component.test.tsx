import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type StorefrontProductsSearch } from "~/src/modules/storefront-search/storefront-search.zod"

import { buildBreadcrumbStructuredData } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

interface NavigateOptions {
  readonly replace?: boolean
  readonly search?: (current: StorefrontProductsSearch) => StorefrontProductsSearch
}

interface CatalogPageProps {
  readonly header: { readonly eyebrow: string; readonly title: string }
  readonly i18nNamespace: string
  readonly onSearchChange: (patch: Partial<StorefrontProductsSearch>, options?: { readonly clearAll?: boolean }) => void
  readonly search: StorefrontProductsSearch
}

interface PageMetaTags {
  readonly meta: readonly Readonly<{ "script:ld+json"?: object; content?: string; name?: string; title?: string }>[]
}

interface ProductsPageMeta {
  readonly description: string
  readonly structuredData: object
  readonly title: string
}

interface RouteDefinition {
  readonly beforeLoad?: (ctx: Readonly<{ search: StorefrontProductsSearch }>) => { readonly catalogSearch: StorefrontProductsSearch }
  readonly component?: () => JSX.Element
  readonly head?: (ctx: Readonly<{ loaderData?: Readonly<ProductsPageMeta> | undefined }>) => PageMetaTags
  readonly loader?: (
    ctx: Readonly<{
      context: { catalogSearch: StorefrontProductsSearch; imagePrefetchService: unknown; locale: SupportedLocale; queryClient: QueryClient }
      deps: Pick<StorefrontProductsSearch, "q">
    }>,
  ) => Promise<ProductsPageMeta>
  readonly loaderDeps?: (ctx: Readonly<{ search: StorefrontProductsSearch }>) => Pick<StorefrontProductsSearch, "q">
  readonly staticData?: unknown
}

const router = vi.hoisted(() => ({ navigate: vi.fn<(options: NavigateOptions) => void>() }))

const prefetch = vi.hoisted(() => ({ page: vi.fn<(...args: readonly unknown[]) => Promise<void>>() }))

const searchState: { current: StorefrontProductsSearch } = { current: {} }

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return { ...options, useNavigate: () => router.navigate, useSearch: () => searchState.current }
    },
  }
})
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog-page", () => ({
  ProductsCatalogPage: ({ header, i18nNamespace, onSearchChange, search }: Readonly<CatalogPageProps>): JSX.Element => (
    <section>
      <p data-testid="eyebrow">{header.eyebrow}</p>
      <h1>{header.title}</h1>
      <p data-testid="namespace">{i18nNamespace}</p>
      <p data-testid="search">{JSON.stringify(search)}</p>
      <button
        type="button"
        onClick={() => {
          onSearchChange({ sort: "price_asc" })
        }}
      >
        sort by price
      </button>
      <button
        type="button"
        onClick={() => {
          onSearchChange({}, { clearAll: true })
        }}
      >
        clear filters
      </button>
    </section>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader", () => ({
  prefetchProductsCatalogPage: prefetch.page,
}))

await import("~/src/routes/_storefront.products.index")

const route = captured.current

if (route?.component === undefined || route.head === undefined || route.loader === undefined || route.loaderDeps === undefined) {
  throw new Error("the storefront products route did not register its component, head, loader and deps")
}

const ProductsPage = route.component

const titleOf = (tags: PageMetaTags) => tags.meta.find((tag) => tag.title !== undefined)?.title

const descriptionOf = (tags: PageMetaTags) => tags.meta.find((tag) => tag.name === "description")?.content

const lastSearchUpdater = () => {
  const options = router.navigate.mock.calls.at(-1)?.[0]
  if (options?.search === undefined) {
    throw new Error("the products page navigated without a search updater")
  }

  return options.search
}

beforeEach(() => {
  vi.clearAllMocks()
  searchState.current = {}
  prefetch.page.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe("storefront products page", () => {
  it("titles the catalogue from the products namespace", () => {
    renderWithProviders(<ProductsPage />)

    expect(screen.getByTestId("eyebrow")).toHaveTextContent("Catalog")
    expect(screen.getByRole("heading", { level: 1, name: "All Products" })).toBeInTheDocument()
    expect(screen.getByTestId("namespace")).toHaveTextContent("pages.products")
  })

  it("hands the URL search straight to the catalogue", () => {
    searchState.current = { category: "rings", sort: "newest" }
    renderWithProviders(<ProductsPage />)

    expect(screen.getByTestId("search")).toHaveTextContent('{"category":"rings","sort":"newest"}')
  })
})

describe("storefront products search changes", () => {
  it("replaces the current history entry instead of stacking one per filter", async () => {
    renderWithProviders(<ProductsPage />)
    await userEvent.click(screen.getByRole("button", { name: "sort by price" }))

    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ replace: true }))
  })

  it("merges the patch into the search already in the URL", async () => {
    renderWithProviders(<ProductsPage />)
    await userEvent.click(screen.getByRole("button", { name: "sort by price" }))

    expect(lastSearchUpdater()({ category: "rings" })).toStrictEqual({ category: "rings", sort: "price_asc" })
  })

  it("drops every filter when the catalogue asks for a clean slate", async () => {
    renderWithProviders(<ProductsPage />)
    await userEvent.click(screen.getByRole("button", { name: "clear filters" }))

    expect(lastSearchUpdater()({ category: "rings", q: "silver" })).toStrictEqual({})
  })
})

describe("storefront products head", () => {
  it("falls back to the shop name alone before the loader has run", () => {
    const tags = route.head?.({ loaderData: undefined })

    expect(tags === undefined ? undefined : titleOf(tags)).toBe(APP_NAME)
    expect(tags === undefined ? undefined : descriptionOf(tags)).toBe("")
    expect(tags?.meta.some((tag) => tag["script:ld+json"] !== undefined)).toBe(false)
  })

  it("puts the page title in front of the shop name once the loader has run", () => {
    const tags = route.head?.({
      loaderData: { description: "Browse our complete collection of exquisite jewelry.", structuredData: {}, title: "All Products" },
    })

    expect(tags === undefined ? undefined : titleOf(tags)).toBe(`All Products | ${APP_NAME}`)
    expect(tags === undefined ? undefined : descriptionOf(tags)).toBe("Browse our complete collection of exquisite jewelry.")
  })

  it("publishes the loaded breadcrumb as the page's json-ld", () => {
    const structuredData = { "@type": "BreadcrumbList" }

    expect(route.head?.({ loaderData: { description: "", structuredData, title: "All Products" } }).meta.at(-1)).toStrictEqual({
      "script:ld+json": structuredData,
    })
  })
})

describe("storefront products route data", () => {
  it("loads only the products namespace", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.products"] })
  })

  it("hands the loader only the recognised search keys, through its context", () => {
    expect(route.beforeLoad?.({ search: { category: "rings", q: "silver", sort: "newest" } })).toStrictEqual({
      catalogSearch: { category: "rings", q: "silver", sort: "newest" },
    })
  })

  it("reloads the page for a new search term but not for a filter, which the grid applies in place", () => {
    expect(route.loaderDeps?.({ search: { category: "rings", q: "silver", sort: "newest" } })).toStrictEqual({ q: "silver" })
    expect(route.loaderDeps?.({ search: { minPrice: 100 } })).toStrictEqual({ q: undefined })
  })

  it("heads a search with the query instead of the catalogue title", () => {
    searchState.current = { q: "pierścionek" }
    renderWithProviders(<ProductsPage />)

    expect(screen.getByTestId("eyebrow")).toHaveTextContent("Search")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Results for “pierścionek”")
  })

  it("titles the tab after the query while a search is active", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const imagePrefetchService = { prefetch: vi.fn() }

    await expect(
      route.loader?.({
        context: { catalogSearch: { q: "pierścionek" }, imagePrefetchService, locale: "en-US", queryClient },
        deps: { q: "pierścionek" },
      }),
    ).resolves.toMatchObject({ title: "Search: pierścionek" })
  })

  it("returns the page title and description from the message catalogue", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const imagePrefetchService = { prefetch: vi.fn() }

    await expect(
      route.loader?.({ context: { catalogSearch: { category: "rings" }, imagePrefetchService, locale: "en-US", queryClient }, deps: {} }),
    ).resolves.toStrictEqual({
      description: "Browse our complete collection of exquisite jewelry.",
      structuredData: buildBreadcrumbStructuredData({ leaf: "All Products", locale: "en-US", sections: [] }),
      title: "All Products",
    })
  })

  it("prefetches the first catalogue page for the search in the URL", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const imagePrefetchService = { prefetch: vi.fn() }

    await route.loader?.({
      context: { catalogSearch: { category: "rings" }, imagePrefetchService, locale: "en-US", queryClient },
      deps: {},
    })

    expect(prefetch.page).toHaveBeenCalledExactlyOnceWith(queryClient, imagePrefetchService, { search: { category: "rings" } })
  })
})
