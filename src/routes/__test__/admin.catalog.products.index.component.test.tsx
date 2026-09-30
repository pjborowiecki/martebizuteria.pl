import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface PrefetchedQuery {
  readonly queryKey: readonly unknown[]
  readonly staleTime?: unknown
}

interface LoaderContext {
  readonly context: {
    readonly queryClient: {
      readonly query: (options: PrefetchedQuery) => Promise<unknown>
    }
  }
}

interface ProductsRouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (context: LoaderContext) => Promise<void>
  readonly shouldReload?: unknown
  readonly staleTime?: unknown
}

const prefetched = vi.hoisted(() => ({ queries: [] as PrefetchedQuery[] }))

const captured: { current: ProductsRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: ProductsRouteDefinition) => {
      captured.current = options

      return { options }
    },
  }
})
vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: {}, handler: vi.fn() } }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { drizzle } = await import("drizzle-orm/sqlite-proxy")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")

  return { db: drizzle(() => Promise.resolve({ rows: [] }), { schema }) }
})
vi.mock("~/src/modules/product/use-cases/get-admin-products", async () => {
  const { PRODUCT_QUERY_KEYS } = await import("~/src/modules/product/product.constants")

  return { getAdminProductsQuery: () => ({ queryKey: PRODUCT_QUERY_KEYS.ADMIN.ALL }) }
})
vi.mock("~/src/modules/product/use-cases/get-product-stats", async () => {
  const { PRODUCT_QUERY_KEYS } = await import("~/src/modules/product/product.constants")

  return { getProductStatsQuery: () => ({ queryKey: PRODUCT_QUERY_KEYS.ADMIN.STATS }) }
})
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", async () => {
  const { CATEGORY_QUERY_KEYS } = await import("~/src/modules/product-category/product-category.constants")

  return { getAdminCategoriesQuery: () => ({ queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL }) }
})
vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", async () => {
  const { COLLECTION_QUERY_KEYS } = await import("~/src/modules/product-collection/product-collection.constants")

  return { getAdminCollectionsQuery: () => ({ queryKey: COLLECTION_QUERY_KEYS.ADMIN.ALL }) }
})
vi.mock("~/src/modules/product-attribute/use-cases/get-admin-product-attributes", async () => {
  const { PRODUCT_ATTRIBUTE_QUERY_KEYS } = await import("~/src/modules/product-attribute/product-attribute.constants")

  return { getAdminProductAttributesQuery: () => ({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL }) }
})
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-table", async () => {
  const { useProductsSheet } = await import("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-sheet")

  return {
    ProductsTableContent: (): JSX.Element => {
      const { mode, open } = useProductsSheet()

      return <p>{`${mode}|${String(open)}`}</p>
    },
  }
})

import { PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"

await import("~/src/routes/admin.catalog.products.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin products index route did not register any options")
}

const renderRoute = () => {
  const ProductsIndexRoute = route.component
  if (ProductsIndexRoute === undefined) {
    throw new Error("the admin products index route registered no component")
  }

  return renderWithProviders(<ProductsIndexRoute />)
}

const runLoader = async (): Promise<void> => {
  await route.loader?.({
    context: {
      queryClient: {
        query: (options: PrefetchedQuery) => {
          prefetched.queries.push(options)

          return Promise.resolve(undefined)
        },
      },
    },
  })
}

afterEach(() => {
  cleanup()
  prefetched.queries = []
})

describe("admin products index route", () => {
  it("hands a closed sheet to the table below it", () => {
    renderRoute()

    expect(screen.getByText("closed|false")).toBeInTheDocument()
  })

  it("keeps the list fresh for the shared product window", () => {
    expect(route.staleTime).toBe(PRODUCT_QUERY_STALE_MS)
  })

  it("never reloads the list on a revisit", () => {
    expect(route.shouldReload).toBe(false)
  })
})

describe("admin products index loader", () => {
  it("prefetches the list, the figures and every filter source the table offers", async () => {
    await runLoader()

    expect(prefetched.queries.map((query) => query.queryKey)).toStrictEqual([
      ["admin", "products"],
      ["admin", "products", "stats"],
      ["admin", "categories"],
      ["admin", "collections"],
      ["admin", "product-attributes"],
    ])
  })

  it("keeps every prefetched entry out of the refetch cycle", async () => {
    await runLoader()

    expect(prefetched.queries.map((query) => query.staleTime)).toStrictEqual(["static", "static", "static", "static", "static"])
  })
})
