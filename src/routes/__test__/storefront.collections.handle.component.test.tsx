import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import {
  type StorefrontProductsSearch,
  type StorefrontScopedCollectionCatalogSearch,
} from "~/src/modules/product/product.storefront-catalog"

import { ImagePrefetchService } from "~/src/lib/image"

import { APP_NAME } from "~/src/presentation/branding/app"

interface MetaEntry {
  readonly content?: string
  readonly name?: string
  readonly title?: string
}

interface FoundLoaderData {
  readonly metaDescription: string
  readonly status: "found"
  readonly title: string
}

interface UnavailableLoaderData {
  readonly metaDescription: string
  readonly metaTitle: string
  readonly status: "unavailable"
}

type LoaderData = FoundLoaderData | UnavailableLoaderData

interface NavigateOptions {
  readonly replace: boolean
  readonly search: (current: StorefrontProductsSearch) => StorefrontProductsSearch
}

interface LoaderArgs {
  readonly context: {
    readonly imagePrefetchService: ImagePrefetchService
    readonly locale: SupportedLocale
    readonly queryClient: QueryClient
  }
  readonly deps: StorefrontProductsSearch
  readonly params: { readonly handle: string }
}

interface CollectionRouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: (args: { readonly loaderData?: LoaderData | undefined }) => { readonly meta: readonly MetaEntry[] }
  readonly loader?: (args: LoaderArgs) => Promise<LoaderData>
  readonly loaderDeps?: (args: { readonly search: StorefrontScopedCollectionCatalogSearch }) => StorefrontProductsSearch
  readonly staticData?: { readonly namespaces: readonly string[] }
  readonly validateSearch?: unknown
}

const captured: { current: CollectionRouteDefinition | undefined } = { current: undefined }

const state = vi.hoisted(
  (): {
    handle: string
    loaderData: LoaderData
    navigate: ReturnType<typeof vi.fn<(options: NavigateOptions) => Promise<void>>>
    search: StorefrontScopedCollectionCatalogSearch
  } => ({
    handle: "srebro-925",
    loaderData: { metaDescription: "", metaTitle: "", status: "unavailable" },
    navigate: vi.fn<(options: NavigateOptions) => Promise<void>>(),
    search: {},
  }),
)

const collection = vi.hoisted(() => ({
  getStorefrontCollection: vi.fn<(input: { data: string }) => Promise<unknown>>(),
  prefetchProductsCatalogPage: vi.fn<(...args: readonly unknown[]) => Promise<void>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: CollectionRouteDefinition) => {
      captured.current = options

      return {
        options,
        useLoaderData: () => state.loaderData,
        useNavigate: () => state.navigate,
        useParams: () => ({ handle: state.handle }),
        useSearch: () => state.search,
      }
    },
  }
})
vi.mock("~/src/lib/catalog-debug-log", () => ({ catalogDebugLog: vi.fn() }))
vi.mock("~/src/lib/image", () => ({ ImagePrefetchService: vi.fn() }))
vi.mock("~/src/modules/product-collection/use-cases/get-storefront-collection", () => ({
  getStorefrontCollection: collection.getStorefrontCollection,
}))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve([{ handle: "zloto", id: "collection-2" }]), queryKey: ["collections"] }),
}))
vi.mock("~/src/modules/product/use-cases/get-new-arrivals", () => ({
  getNewArrivalsQuery: () => ({ queryFn: () => Promise.resolve([{ handle: "nowosc", id: "product-1" }]), queryKey: ["new-arrivals"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader", () => ({
  prefetchProductsCatalogPage: collection.prefetchProductsCatalogPage,
}))
vi.mock("~/src/presentation/components/custom/pages/collections/collection-unavailable-page", () => ({
  CollectionUnavailablePage: (): JSX.Element => <section data-testid="collection-unavailable" />,
}))
vi.mock("~/src/presentation/components/custom/pages/products-catalog/products-catalog-page", () => ({
  ProductsCatalogPage: ({
    header,
    i18nNamespace,
    onSearchChange,
    scope,
    search,
  }: Readonly<{
    header: { readonly eyebrow: string; readonly title: string }
    i18nNamespace: string
    onSearchChange: (patch: Partial<StorefrontProductsSearch>, options?: { readonly clearAll?: boolean }) => void
    scope: { readonly collectionHandle?: string }
    search: StorefrontProductsSearch
  }>): JSX.Element => (
    <section>
      <p>{header.eyebrow}</p>
      <h1>{header.title}</h1>
      <output data-testid="catalog-namespace">{i18nNamespace}</output>
      <output data-testid="catalog-scope">{scope.collectionHandle ?? "no scope"}</output>
      <output data-testid="catalog-search">{JSON.stringify(search)}</output>
      <button
        onClick={() => {
          onSearchChange({ q: "gold" })
        }}
        type="button"
      >
        search for gold
      </button>
      <button
        onClick={() => {
          onSearchChange({}, { clearAll: true })
        }}
        type="button"
      >
        clear filters
      </button>
    </section>
  ),
}))

await import("~/src/routes/_storefront.collections.$handle")

const route = captured.current

if (route === undefined) {
  throw new Error("the collection handle route registered no options")
}

const renderPage = () => {
  const Page = route.component
  if (Page === undefined) {
    throw new Error("the collection handle route renders no component")
  }

  return renderWithProviders(<Page />)
}

const loaderArgs = (deps: StorefrontProductsSearch = {}): LoaderArgs => ({
  context: { imagePrefetchService: new ImagePrefetchService(), locale: "en-US", queryClient: new QueryClient() },
  deps,
  params: { handle: state.handle },
})

const runLoader = (deps: StorefrontProductsSearch = {}): Promise<LoaderData> => {
  const { loader } = route
  if (loader === undefined) {
    throw new Error("the collection handle route has no loader")
  }

  return loader(loaderArgs(deps))
}

const headMeta = (loaderData?: LoaderData): readonly MetaEntry[] => {
  const { head } = route
  if (head === undefined) {
    throw new Error("the collection handle route builds no head")
  }

  return head({ loaderData }).meta
}

const COLLECTION_ROW = {
  descriptions: { "en-US": "Sterling silver, cast by hand.", "pl-PL": "Srebro 925, kute rekoma." },
  handle: "srebro-925",
  id: "collection-1",
  titles: { "en-US": "Sterling silver", "pl-PL": "Srebro 925" },
}

beforeEach(() => {
  state.handle = "srebro-925"
  state.search = {}
  state.loaderData = { metaDescription: "", metaTitle: "", status: "unavailable" }
  state.navigate.mockReset()
  state.navigate.mockResolvedValue(undefined)
  collection.getStorefrontCollection.mockReset()
  collection.getStorefrontCollection.mockResolvedValue(COLLECTION_ROW)
  collection.prefetchProductsCatalogPage.mockReset()
  collection.prefetchProductsCatalogPage.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe("the storefront collection page", () => {
  it("shows the unavailable notice instead of a catalog when the collection is gone", () => {
    renderPage()

    expect(screen.getByTestId("collection-unavailable")).toBeInTheDocument()
    expect(screen.queryByTestId("catalog-scope")).toBeNull()
  })

  it("heads the catalog with the loaded collection title", () => {
    state.loaderData = {
      metaDescription: "Sterling silver, cast by hand.",
      status: "found",
      title: "Sterling silver",
    }
    renderPage()

    expect(screen.getByRole("heading", { level: 1, name: "Sterling silver" })).toBeInTheDocument()
    expect(screen.getByText("Collection")).toBeInTheDocument()
  })

  it("scopes the catalog to the collection handle in the address bar", () => {
    state.handle = "zloto-585"
    state.loaderData = { metaDescription: "Gold", status: "found", title: "Gold" }
    renderPage()

    expect(screen.getByTestId("catalog-scope")).toHaveTextContent("zloto-585")
    expect(screen.getByTestId("catalog-namespace")).toHaveTextContent("pages.collection")
  })

  it("hands the current filters down to the catalog", () => {
    state.loaderData = { metaDescription: "Gold", status: "found", title: "Gold" }
    state.search = { minPrice: 1000, q: "silver" }
    renderPage()

    expect(screen.getByTestId("catalog-search")).toHaveTextContent('{"minPrice":1000,"q":"silver"}')
  })
})

describe("the storefront collection page filters", () => {
  beforeEach(() => {
    state.loaderData = { metaDescription: "Gold", status: "found", title: "Gold" }
  })

  it("rewrites the address bar in place when a filter changes", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: "search for gold" }))

    const options = state.navigate.mock.calls[0]?.[0]

    expect(options?.replace).toBe(true)
    expect(options?.search({ minPrice: 1000 })).toStrictEqual({ minPrice: 1000, q: "gold" })
  })

  it("drops every filter when the catalog asks for a reset", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: "clear filters" }))

    expect(state.navigate.mock.calls[0]?.[0]?.search({ minPrice: 1000, q: "silver" })).toStrictEqual({})
  })
})

describe("the storefront collection metadata", () => {
  it("titles a found collection after the collection and the store", () => {
    const meta = headMeta({
      metaDescription: "Sterling silver, cast by hand.",
      status: "found",
      title: "Sterling silver",
    })

    expect(meta).toStrictEqual([
      { title: `Sterling silver | ${APP_NAME}` },
      { content: "Sterling silver, cast by hand.", name: "description" },
    ])
  })

  it("titles a missing collection after the unavailable copy", () => {
    const meta = headMeta({
      metaDescription: "The collection has closed.",
      metaTitle: "This edition is waiting for its moment",
      status: "unavailable",
    })

    expect(meta).toStrictEqual([
      { title: `This edition is waiting for its moment | ${APP_NAME}` },
      { content: "The collection has closed.", name: "description" },
    ])
  })

  it("falls back to the store name before the loader has run", () => {
    expect(headMeta()).toStrictEqual([{ title: APP_NAME }, { content: "", name: "description" }])
  })
})

describe("the storefront collection loader", () => {
  it("resolves the collection title and its meta description for the active locale", async () => {
    await expect(runLoader()).resolves.toStrictEqual({
      metaDescription: "Sterling silver, cast by hand.",
      status: "found",
      title: "Sterling silver",
    })
  })

  it("asks for the collection named in the address bar", async () => {
    state.handle = "zloto-585"
    await runLoader()

    expect(collection.getStorefrontCollection).toHaveBeenCalledWith({ data: "zloto-585" })
  })

  it("warms the catalog for the collection and the current filters", async () => {
    await runLoader({ minPrice: 1000, sort: "price_asc" })

    expect(collection.prefetchProductsCatalogPage.mock.calls[0]?.[2]).toStrictEqual({
      scope: { collectionHandle: "srebro-925" },
      search: { minPrice: 1000, sort: "price_asc" },
    })
  })

  it("falls back to the catalog description when the collection has none", async () => {
    collection.getStorefrontCollection.mockResolvedValue({ ...COLLECTION_ROW, descriptions: null })

    await expect(runLoader()).resolves.toStrictEqual({
      metaDescription: "Browse our complete collection of exquisite jewelry.",
      status: "found",
      title: "Sterling silver",
    })
  })

  it("answers with the unavailable copy when no such collection exists", async () => {
    collection.getStorefrontCollection.mockResolvedValue(undefined)

    await expect(runLoader()).resolves.toStrictEqual({
      metaDescription:
        "The collection you selected is not currently available in our atelier — we may still be preparing a new selection, or this chapter may have come to a close. We would be delighted to guide you toward other paths of discovery.",
      metaTitle: "This edition is waiting for its moment",
      status: "unavailable",
    })
  })

  it("warms the other collections and the new arrivals for the unavailable page", async () => {
    collection.getStorefrontCollection.mockResolvedValue(undefined)
    const args = loaderArgs()
    const { loader } = route
    await loader?.(args)

    expect(args.context.queryClient.getQueryData(["collections"])).toStrictEqual([{ handle: "zloto", id: "collection-2" }])
    expect(args.context.queryClient.getQueryData(["new-arrivals"])).toStrictEqual([{ handle: "nowosc", id: "product-1" }])
  })

  it("does not warm the catalog for a collection that does not exist", async () => {
    collection.getStorefrontCollection.mockResolvedValue(undefined)
    await runLoader()

    expect(collection.prefetchProductsCatalogPage).not.toHaveBeenCalled()
  })
})

describe("the storefront collection route wiring", () => {
  it("keeps only the filters that carry a value in the loader dependencies", () => {
    expect(route.loaderDeps?.({ search: { maxPrice: undefined, q: "silver", sort: "newest" } })).toStrictEqual({
      q: "silver",
      sort: "newest",
    })
  })

  it("loads the collection and products namespaces", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.collection", "pages.products"] })
  })

  it("validates the filters carried in the address bar", () => {
    expect(route.validateSearch).toBeDefined()
  })
})
