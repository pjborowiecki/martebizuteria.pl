import { type JSX, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { isNotFound } from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type * as ImageLib from "~/src/lib/image"
import { pageHead } from "~/src/lib/seo"

interface StorefrontProduct {
  readonly categoryId: string | null
  readonly description: string
  readonly id: string
  readonly thumbnail: string | null
  readonly title: string
  readonly titles: Record<string, string>
}

interface RelatedRow {
  readonly handle: string
  readonly id: string
  readonly subtitles: Record<string, string> | null
  readonly thumbnail: string | null
  readonly titles: Record<string, string>
  readonly variants?: readonly { readonly id: string; readonly price: number; readonly title: string }[]
}

interface TestQueryClient {
  readonly query: <TData>(options: { readonly queryFn: () => Promise<TData> }) => Promise<TData>
}

interface ProductRouteOptions {
  readonly component?: () => JSX.Element
  readonly head?: (args: Readonly<{ loaderData?: Readonly<{ description?: string | null; title: string }> | undefined }>) => {
    readonly meta: readonly Readonly<Record<string, unknown>>[]
  }
  readonly loader?: (
    args: Readonly<{
      context: { imagePrefetchService: unknown; locale: SupportedLocale; queryClient: TestQueryClient }
      params: { handle: string }
    }>,
  ) => Promise<{ readonly deferredRelated?: Promise<unknown> | undefined; readonly description: string; readonly title: string }>
  readonly staticData?: { readonly namespaces?: readonly string[] }
}

const PRODUCT_KEY = ["product", "silver-ring", "en-US"] as const

const silverRing: StorefrontProduct = {
  categoryId: "category-rings",
  description: "A fine silver ring.",
  id: "product-1",
  thumbnail: "https://images.test/silver-ring.jpg",
  title: "Silver ring",
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
}

const route = vi.hoisted(() => ({
  captured: {} as { current?: ProductRouteOptions },
  context: { locale: "en-US" },
  loaderData: {} as { deferredRelated?: Promise<readonly RelatedRow[]> | undefined },
  params: { handle: "silver-ring" },
}))

const catalog = vi.hoisted(() => ({
  prefetchSingleProductImage: vi.fn<(product: unknown, service: unknown) => void>(),
  product: undefined as unknown,
  related: [] as unknown[],
  relatedArgs: vi.fn<(categoryId: unknown, excludeProductId: unknown, locale: unknown) => void>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: ProductRouteOptions) => {
      route.captured.current = options

      return {
        options,
        useLoaderData: () => route.loaderData,
        useParams: () => route.params,
        useRouteContext: () => route.context,
      }
    },
  }
})
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://cdn.example.test",
  getAssetURL: (path: string) => `https://cdn.example.test/${path}`,
  getBaseURL: () => "https://shop.example.test",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/lib/image", async (importOriginal) => {
  const actual = await importOriginal<typeof ImageLib>()

  return { ...actual, prefetchSingleProductImage: catalog.prefetchSingleProductImage }
})
vi.mock("~/src/modules/product/use-cases/get-product", () => ({
  getProductQuery: (handle: string, locale: string) => ({
    queryFn: () => Promise.resolve(catalog.product),
    queryKey: ["product", handle, locale],
  }),
}))
vi.mock("~/src/modules/product/use-cases/get-related-products", () => ({
  getRelatedProductsQuery: (categoryId: unknown, excludeProductId: unknown, locale: unknown) => {
    catalog.relatedArgs(categoryId, excludeProductId, locale)

    return { queryFn: () => Promise.resolve(catalog.related), queryKey: ["related", categoryId, excludeProductId, locale] }
  },
}))
vi.mock("~/src/presentation/components/custom/pages/product-page/hooks/use-product-animations", () => ({
  useProductAnimations: vi.fn<() => void>(),
}))
vi.mock("~/src/presentation/components/custom/pages/product-page/sections/product-hero-section", () => ({
  ProductHeroSection: ({ product }: Readonly<{ product: { title: string } }>): JSX.Element => (
    <section>{`hero for ${product.title}`}</section>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/product-page/sections/product-related-section", () => ({
  ProductRelatedSection: ({
    products,
  }: Readonly<{
    products: readonly {
      handle: string
      image: string
      name: string
      subtitle: string
      variantId?: string | undefined
      variantPrice?: number | undefined
      variantTitle?: string | undefined
    }[]
  }>): JSX.Element => (
    <ul>
      {products.map((product) => (
        <li key={product.handle}>
          {`${product.name} · ${product.subtitle} · ${product.image} · ${product.variantId ?? "-"} · ${String(product.variantPrice ?? "-")} · ${product.variantTitle ?? "-"}`}
        </li>
      ))}
    </ul>
  ),
}))

await import("~/src/routes/_storefront.products.$handle")

const routeOptions = route.captured.current ?? {}

const ProductPage = (): JSX.Element => {
  const { component: Component } = routeOptions
  if (Component === undefined) {
    throw new Error("the product route registered no component")
  }

  return (
    <Suspense fallback={<span>page loading</span>}>
      <Component />
    </Suspense>
  )
}

const renderProductPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(PRODUCT_KEY, catalog.product)

  return renderWithProviders(<ProductPage />, { queryClient })
}

const relatedRow = (overrides: Partial<RelatedRow> = {}): RelatedRow => ({
  handle: "gold-ring",
  id: "product-2",
  subtitles: { "en-US": "18k gold", "pl-PL": "Zloto 18k" },
  thumbnail: "https://images.test/gold-ring.jpg",
  titles: { "en-US": "Gold ring", "pl-PL": "Zloty pierscionek" },
  variants: [{ id: "variant-2", price: 129_900, title: "One size" }],
  ...overrides,
})

const queryClient: TestQueryClient = { query: (options) => options.queryFn() }

const streamed = <TValue,>(value: TValue): Promise<TValue> => Object.assign(Promise.resolve(value), { status: "fulfilled" as const, value })

const runLoader = () =>
  routeOptions.loader?.({
    context: { imagePrefetchService: { seen: new Set<string>() }, locale: "en-US", queryClient },
    params: { handle: "silver-ring" },
  })

beforeEach(() => {
  vi.clearAllMocks()
  catalog.product = silverRing
  catalog.related = []
  route.context = { locale: "en-US" }
  route.loaderData = { deferredRelated: streamed([]) }
  route.params = { handle: "silver-ring" }
})

afterEach(cleanup)

describe("storefront product page", () => {
  it("shows the hero for the product the handle names", async () => {
    renderProductPage()

    expect(await screen.findByText("hero for Silver ring")).toBeInTheDocument()
  })

  it("tells the shopper when the handle matches no sellable product", async () => {
    catalog.product = false
    renderProductPage()

    expect(await screen.findByText("Product not found")).toBeInTheDocument()
    expect(screen.queryByText(/^hero for/u)).toBeNull()
  })

  it("lists no related products when the category has no others", async () => {
    route.loaderData = { deferredRelated: streamed([]) }
    renderProductPage()
    await screen.findByText("hero for Silver ring")

    expect(screen.queryAllByRole("listitem")).toStrictEqual([])
  })

  it("holds the related strip open while the deferred query is still running", async () => {
    route.loaderData = { deferredRelated: new Promise<readonly RelatedRow[]>(() => {}) }
    renderProductPage()

    expect(await screen.findByText("Loading related products...")).toBeInTheDocument()
  })

  it("maps each related product onto the card fields once the deferred query settles", async () => {
    route.loaderData = { deferredRelated: streamed([relatedRow()]) }
    renderProductPage()

    expect(
      await screen.findByText("Gold ring · 18k gold · https://images.test/gold-ring.jpg · variant-2 · 129900 · One size"),
    ).toBeInTheDocument()
  })

  it("names a related product in the locale the page is read in", async () => {
    route.context = { locale: "pl-PL" }
    route.loaderData = { deferredRelated: streamed([relatedRow()]) }
    renderProductPage()

    expect(await screen.findByText(/^Zloty pierscionek · Zloto 18k/u)).toBeInTheDocument()
  })

  it("falls back to the placeholder image for a related product with no thumbnail", async () => {
    route.loaderData = { deferredRelated: streamed([relatedRow({ thumbnail: null })]) }
    renderProductPage()

    expect(await screen.findByText(/https:\/\/cdn\.example\.test\/placeholder\.svg/u)).toBeInTheDocument()
  })

  it("leaves the variant fields empty for a related product with no variants", async () => {
    route.loaderData = { deferredRelated: streamed([relatedRow({ variants: [] })]) }
    renderProductPage()

    expect(await screen.findByText(/· - · - · -$/u)).toBeInTheDocument()
  })
})

describe("storefront product head", () => {
  it("registers the shared page head builder, so the product gets open graph tags too", () => {
    expect(routeOptions.head).toBe(pageHead)
  })
})

describe("storefront product loader", () => {
  it("hands the page title and description to the head", async () => {
    await expect(runLoader()).resolves.toMatchObject({ description: "A fine silver ring.", title: "Silver ring | M'Arte" })
  })

  it("warms the hero image before the page paints", async () => {
    await runLoader()

    expect(catalog.prefetchSingleProductImage).toHaveBeenCalledTimes(1)
    expect(catalog.prefetchSingleProductImage.mock.lastCall?.[0]).toBe(silverRing)
  })

  it("defers the related products of the same category, excluding the product itself", async () => {
    catalog.related = [relatedRow()]

    const result = await runLoader()

    expect(catalog.relatedArgs).toHaveBeenCalledWith("category-rings", "product-1", "en-US")
    await expect(result?.deferredRelated).resolves.toStrictEqual([relatedRow()])
  })

  it("raises a not found for a handle with no sellable product", async () => {
    catalog.product = false
    const caught: { thrown?: unknown } = {}

    try {
      await runLoader()
    } catch (error: unknown) {
      caught.thrown = error
    }

    expect(isNotFound(caught.thrown)).toBe(true)
  })

  it("asks for no related products once the handle is a miss", async () => {
    catalog.product = false

    await expect(runLoader()).rejects.toBeDefined()

    expect(catalog.relatedArgs).not.toHaveBeenCalled()
    expect(catalog.prefetchSingleProductImage).not.toHaveBeenCalled()
  })
})

describe("storefront product route", () => {
  it("loads only the product namespace", () => {
    expect(routeOptions.staticData).toStrictEqual({ namespaces: ["pages.product"] })
  })
})
