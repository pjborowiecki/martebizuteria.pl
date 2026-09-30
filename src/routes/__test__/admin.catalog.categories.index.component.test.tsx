import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface CategoriesRouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (context: { readonly context: { readonly queryClient: QueryClient } }) => Promise<void>
  readonly shouldReload?: boolean
  readonly staleTime?: number
}

const queries = vi.hoisted(() => ({
  categories: vi.fn(() => Promise.resolve([{ handle: "rings", id: "category-1" }])),
  stats: vi.fn(() => Promise.resolve({ active: 1, draft: 0, total: 1 })),
}))

const captured: { current: CategoriesRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: CategoriesRouteDefinition) => {
      captured.current = options

      return { options }
    },
  }
})
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () => ({ queryFn: queries.categories, queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL }),
}))
vi.mock("~/src/modules/product-category/use-cases/get-category-stats", () => ({
  getCategoryStatsQuery: () => ({ queryFn: queries.stats, queryKey: CATEGORY_QUERY_KEYS.ADMIN.STATS }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-table", async () => {
  const { useCategoriesSheet } =
    await import("~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-sheet")

  return {
    CategoriesTableContent: (): JSX.Element => {
      const { mode, open } = useCategoriesSheet()

      return <p>{`${mode}|${String(open)}`}</p>
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CATEGORY_QUERY_KEYS, CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"

await import("~/src/routes/admin.catalog.categories.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin categories route did not register any options")
}

const renderIndex = () => {
  const CategoriesIndexRoute = route.component
  if (CategoriesIndexRoute === undefined) {
    throw new Error("the admin categories route registered no component")
  }

  return renderWithProviders(<CategoriesIndexRoute />)
}

const runLoader = (queryClient: QueryClient): Promise<void> => {
  const { loader } = route
  if (loader === undefined) {
    throw new Error("the admin categories route registered no loader")
  }

  return loader({ context: { queryClient } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("admin categories index route", () => {
  it("hands a closed sheet to the table below it", () => {
    renderIndex()

    expect(screen.getByText("closed|false")).toBeInTheDocument()
  })

  it("keeps the list fresh for the shared category window", () => {
    expect(route.staleTime).toBe(CATEGORY_QUERY_STALE_MS)
  })

  it("never reloads the list on a revisit", () => {
    expect(route.shouldReload).toBe(false)
  })
})

describe("admin categories index loader", () => {
  it("fills the cache with the category list and its stats before the page renders", async () => {
    const queryClient = new QueryClient()

    await runLoader(queryClient)

    expect(queryClient.getQueryData(CATEGORY_QUERY_KEYS.ADMIN.ALL)).toStrictEqual([{ handle: "rings", id: "category-1" }])
    expect(queryClient.getQueryData(CATEGORY_QUERY_KEYS.ADMIN.STATS)).toStrictEqual({ active: 1, draft: 0, total: 1 })
  })

  it("does not ask the server again when the page is revisited", async () => {
    const queryClient = new QueryClient()

    await runLoader(queryClient)
    await runLoader(queryClient)

    expect(queries.categories).toHaveBeenCalledTimes(1)
    expect(queries.stats).toHaveBeenCalledTimes(1)
  })
})
