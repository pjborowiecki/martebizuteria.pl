import { type JSX } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

interface PrefetchedQuery {
  readonly queryKey: readonly unknown[]
  readonly staleTime: unknown
}

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (args: {
    readonly context: { readonly queryClient: { readonly query: (options: PrefetchedQuery) => Promise<unknown> } }
  }) => Promise<void>
  readonly shouldReload?: boolean
  readonly staleTime?: number
  readonly validateSearch?: { readonly parse: (search: Record<string, unknown>) => unknown }
}

const captured = vi.hoisted((): { current: RouteDefinition | undefined } => ({ current: undefined }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/modules/product-attribute/use-cases/get-admin-product-attributes", () => ({
  getAdminProductAttributesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["admin", "attributes"] }),
}))
vi.mock("~/src/modules/product-attribute/use-cases/get-product-attribute-stats", () => ({
  getProductAttributeStatsQuery: () => ({ queryFn: () => Promise.resolve({}), queryKey: ["admin", "attributes", "stats"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-table", () => ({
  AttributesTable: (): JSX.Element => <table data-testid="attributes-table" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants"

await import("~/src/routes/admin.catalog.attributes.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the attributes index route did not register any options")
}

const renderIndex = () => {
  const AttributesIndexRoute = route.component
  if (AttributesIndexRoute === undefined) {
    throw new Error("the attributes index route registered no component")
  }

  return renderWithProviders(<AttributesIndexRoute />)
}

const parseSearch = (search: Record<string, unknown>): unknown => {
  const { validateSearch } = route
  if (validateSearch === undefined) {
    throw new Error("the attributes index route validates no search parameters")
  }

  return validateSearch.parse(search)
}

const runLoader = async (): Promise<{ queried: PrefetchedQuery[] }> => {
  const queried: PrefetchedQuery[] = []
  await route.loader?.({
    context: {
      queryClient: {
        query: (options: PrefetchedQuery) => {
          queried.push(options)

          return Promise.resolve(undefined)
        },
      },
    },
  })

  return { queried }
}

afterEach(() => {
  cleanup()
})

describe("admin attributes index route", () => {
  it("renders the attributes table as the whole page", () => {
    renderIndex()

    expect(screen.getByTestId("attributes-table")).toBeInTheDocument()
  })

  it("prefetches the attributes and their statistics as already fresh", async () => {
    const { queried } = await runLoader()

    expect(queried.map((options) => options.queryKey)).toStrictEqual([
      ["admin", "attributes"],
      ["admin", "attributes", "stats"],
    ])
    expect(queried.map((options) => options.staleTime)).toStrictEqual(["static", "static"])
  })

  it("keeps the prefetched data for as long as the attribute queries stay fresh", () => {
    expect(route.staleTime).toBe(PRODUCT_ATTRIBUTE_QUERY_STALE_MS)
  })

  it("does not reload the route on every navigation back to it", () => {
    expect(route.shouldReload).toBe(false)
  })

  it("opens the create sheet only for the one search value that asks for it", () => {
    expect(parseSearch({ create: "1" })).toStrictEqual({ create: "1" })
    expect(parseSearch({})).toStrictEqual({})
  })

  it("refuses a create search value it does not recognise", () => {
    expect(() => parseSearch({ create: "yes" })).toThrow()
  })
})
