import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { isNotFound } from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type StorefrontProductsSearch } from "~/src/modules/product/product.storefront-catalog"

interface CatalogHeader {
  readonly eyebrow: string
  readonly title: string
}

interface CatalogScope {
  readonly categoryHandle?: string
}

interface CategoryMeta {
  readonly description?: string | undefined
  readonly metaDescription: string
  readonly title: string
}

interface CategoryRouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: (context: { readonly loaderData?: CategoryMeta | undefined }) => {
    readonly meta: readonly { readonly content?: string; readonly name?: string; readonly title?: string }[]
  }
  readonly loader?: (context: {
    readonly context: { readonly imagePrefetchService: unknown; readonly locale: "en-US" | "pl-PL"; readonly queryClient: QueryClient }
    readonly deps: StorefrontProductsSearch
    readonly params: { readonly handle: string }
  }) => Promise<CategoryMeta>
  readonly loaderDeps?: (context: { readonly search: StorefrontProductsSearch }) => StorefrontProductsSearch
  readonly staticData?: { readonly namespaces: readonly string[] }
}

const routing = vi.hoisted(() => ({
  handle: "pierscionki",
  navigate: vi.fn<(options: { replace: boolean; search: (current: StorefrontProductsSearch) => StorefrontProductsSearch }) => void>(),
  search: {} as StorefrontProductsSearch,
}))

const loaderData: { current: CategoryMeta } = {
  current: { metaDescription: "Rings shaped in our atelier.", title: "Rings" },
}

const catalog = vi.hoisted(() => ({
  getStorefrontCategory: vi.fn<(input: { data: string }) => Promise<unknown>>(),
  prefetchProductsCatalogPage: vi.fn(() => Promise.resolve()),
}))

const captured: { current: CategoryRouteDefinition | undefined } = { current: undefined }

vi.mock("~/src/lib/catalog-debug-log", () => ({ catalogDebugLog: vi.fn() }))
vi.mock("~/src/modules/product-category/use-cases/get-storefront-category", () => ({
  getStorefrontCategory: catalog.getStorefrontCategory,
}))
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader", () => ({
  prefetchProductsCatalogPage: catalog.prefetchProductsCatalogPage,
}))
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog-page", () => ({
  ProductsCatalogPage: ({
    header,
    i18nNamespace,
    onSearchChange,
    scope,
    search,
  }: Readonly<{
    header: CatalogHeader
    i18nNamespace: string
    onSearchChange: (patch: Partial<StorefrontProductsSearch>, options?: { readonly clearAll?: boolean }) => void
    scope: CatalogScope
    search: StorefrontProductsSearch
  }>): JSX.Element => (
    <section>
      <p data-testid="eyebrow">{header.eyebrow}</p>
      <h1>{header.title}</h1>
      <p data-testid="namespace">{i18nNamespace}</p>
      <p data-testid="scope">{scope.categoryHandle ?? "no scope"}</p>
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
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: CategoryRouteDefinition) => {
      captured.current = options

      return {
        options,
        useLoaderData: () => loaderData.current,
        useNavigate: () => routing.navigate,
        useParams: () => ({ handle: routing.handle }),
        useSearch: () => routing.search,
      }
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { APP_NAME } from "~/src/presentation/branding/app"

await import("~/src/routes/_storefront.categories.$handle")

const route = captured.current

if (route === undefined) {
  throw new Error("the category handle route did not register any options")
}

const renderCategory = () => {
  const CategoryPage = route.component
  if (CategoryPage === undefined) {
    throw new Error("the category handle route registered no component")
  }

  return renderWithProviders(<CategoryPage />)
}

const runLoader = (handle: string, deps: StorefrontProductsSearch = {}, locale: "en-US" | "pl-PL" = "en-US") => {
  const { loader } = route
  if (loader === undefined) {
    throw new Error("the category handle route registered no loader")
  }

  return loader({
    context: { imagePrefetchService: { prefetch: vi.fn() }, locale, queryClient: new QueryClient() },
    deps,
    params: { handle },
  })
}

const lastSearchUpdate = (current: StorefrontProductsSearch): StorefrontProductsSearch => {
  const call = routing.navigate.mock.calls.at(-1)
  if (call === undefined) {
    throw new Error("the page never asked the router to navigate")
  }

  return call[0].search(current)
}

beforeEach(() => {
  vi.clearAllMocks()
  routing.handle = "pierscionki"
  routing.search = {}
  loaderData.current = { metaDescription: "Rings shaped in our atelier.", title: "Rings" }
  catalog.getStorefrontCategory.mockResolvedValue({
    descriptions: { "en-US": "Rings shaped in our atelier.", "pl-PL": "Pierścionki z naszej pracowni." },
    titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
  })
})

afterEach(cleanup)

describe("storefront category page", () => {
  it("heads the catalogue with the category name the loader resolved", () => {
    renderCategory()

    expect(screen.getByRole("heading", { level: 1, name: "Rings" })).toBeInTheDocument()
  })

  it("labels the page as a category", () => {
    renderCategory()

    expect(screen.getByTestId("eyebrow")).toHaveTextContent("Category")
    expect(screen.getByTestId("namespace")).toHaveTextContent("pages.category")
  })

  it("scopes the catalogue to the category in the url", () => {
    routing.handle = "kolczyki"

    renderCategory()

    expect(screen.getByTestId("scope")).toHaveTextContent("kolczyki")
  })

  it("hands the url search straight to the catalogue", () => {
    routing.search = { q: "srebro", sort: "newest" }

    renderCategory()

    expect(screen.getByTestId("search")).toHaveTextContent('{"q":"srebro","sort":"newest"}')
  })

  it("rewrites the url in place when a filter changes, so the back button still leaves the category", async () => {
    renderCategory()

    await userEvent.click(screen.getByRole("button", { name: "sort by price" }))

    expect(routing.navigate).toHaveBeenCalledTimes(1)
    expect(routing.navigate.mock.calls[0]?.[0].replace).toBe(true)
  })

  it("merges a filter change into the search already in the url", async () => {
    renderCategory()

    await userEvent.click(screen.getByRole("button", { name: "sort by price" }))

    expect(lastSearchUpdate({ q: "srebro" })).toStrictEqual({ q: "srebro", sort: "price_asc" })
  })

  it("empties the search when the catalogue clears every filter", async () => {
    renderCategory()

    await userEvent.click(screen.getByRole("button", { name: "clear filters" }))

    expect(lastSearchUpdate({ maxPrice: 400, q: "srebro" })).toStrictEqual({})
  })
})

describe("storefront category loader", () => {
  it("resolves the title of the category and its meta description in the visitor's language", async () => {
    await expect(runLoader("pierscionki")).resolves.toStrictEqual({
      metaDescription: "Rings shaped in our atelier.",
      title: "Rings",
    })
  })

  it("asks the server for the category named in the url", async () => {
    await runLoader("kolczyki")

    expect(catalog.getStorefrontCategory).toHaveBeenCalledWith({ data: "kolczyki" })
  })

  it("reads the Polish copy for a Polish visitor", async () => {
    const meta = await runLoader("pierscionki", {}, "pl-PL")

    expect(meta.title).toBe("Pierścionki")
    expect(meta.metaDescription).toBe("Pierścionki z naszej pracowni.")
  })

  it("warms the product grid for the category and the search in the url", async () => {
    await runLoader("pierscionki", { sort: "price_asc" })

    expect(catalog.prefetchProductsCatalogPage).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      scope: { categoryHandle: "pierscionki" },
      search: { sort: "price_asc" },
    })
  })

  it("falls back to the catalogue description when the category has none", async () => {
    catalog.getStorefrontCategory.mockResolvedValue({ descriptions: null, titles: { "en-US": "Rings" } })

    await expect(runLoader("pierscionki")).resolves.toStrictEqual({
      metaDescription: "Browse our complete collection of exquisite jewelry.",
      title: "Rings",
    })
  })

  it("reports an unknown handle as a missing page and warms nothing", async () => {
    catalog.getStorefrontCategory.mockResolvedValue(undefined)
    const caught: { thrown?: unknown } = {}

    try {
      await runLoader("nie-ma-takiej")
    } catch (error: unknown) {
      caught.thrown = error
    }

    expect(isNotFound(caught.thrown)).toBe(true)
    expect(catalog.prefetchProductsCatalogPage).not.toHaveBeenCalled()
  })
})

describe("storefront category route metadata", () => {
  it("puts the category name in front of the store name", () => {
    expect(route.head?.({ loaderData: loaderData.current }).meta).toStrictEqual([
      { title: `Rings | ${APP_NAME}` },
      { content: "Rings shaped in our atelier.", name: "description" },
    ])
  })

  it("falls back to the store name while the loader has not run", () => {
    expect(route.head?.({ loaderData: undefined }).meta).toStrictEqual([{ title: APP_NAME }, { content: "", name: "description" }])
  })

  it("keeps only the search keys the catalogue understands out of the url", () => {
    expect(route.loaderDeps?.({ search: { maxPrice: 400, q: "srebro", sort: "newest" } })).toStrictEqual({
      maxPrice: 400,
      q: "srebro",
      sort: "newest",
    })
  })

  it("loads the category and shared product namespaces", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.category", "pages.products"] })
  })
})
