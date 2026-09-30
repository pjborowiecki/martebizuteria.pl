import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"

import { type PageMeta } from "~/src/lib/seo"

interface LoaderContext {
  readonly locale: "en-US" | "pl-PL"
  readonly queryClient: QueryClient
}

interface RouteDefinition {
  readonly loader?: (args: { context: LoaderContext }) => Promise<PageMeta>
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

const catalogue = vi.hoisted(() => ({ fetchCategories: vi.fn() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/modules/product-category/use-cases/get-categories", async () => {
  const { CATEGORY_QUERY_KEYS: keys } = await import("~/src/modules/product-category/product-category.constants")

  return { getCategoriesQuery: () => ({ queryFn: catalogue.fetchCategories, queryKey: keys.ALL }) }
})
vi.mock("~/src/hooks/use-landing-animations", () => ({ useLandingAnimations: () => {} }))
vi.mock("~/src/presentation/components/custom/pages/categories/categories-index-grid", () => ({ CategoriesIndexGrid: () => null }))

await import("~/src/routes/_storefront.categories.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the categories route did not register any options")
}

const runLoader = async (locale: LoaderContext["locale"] = "en-US") => {
  const queryClient = new QueryClient()
  catalogue.fetchCategories.mockResolvedValue([{ handle: "necklaces", id: "category-1" }])
  const meta = await route.loader?.({ context: { locale, queryClient } })

  return { meta, queryClient }
}

describe("storefront categories route loader", () => {
  it("warms the category list before the page renders", async () => {
    const { queryClient } = await runLoader()

    expect(catalogue.fetchCategories).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(CATEGORY_QUERY_KEYS.ALL)).toStrictEqual([{ handle: "necklaces", id: "category-1" }])
  })

  it("describes the page with the English catalogue copy", async () => {
    const { meta } = await runLoader()

    expect(meta).toStrictEqual({
      description:
        "Explore M'Arte jewelry categories — necklaces, earrings, chokers, bracelets, and birthstone pieces in 925 silver and natural stones.",
      title: "Categories | M'Arte",
    })
  })

  it("describes the page in Polish when the visitor reads Polish", async () => {
    const { meta } = await runLoader("pl-PL")

    expect(meta?.title).toBe("Kategorie | M'Arte")
  })
})
