import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  getCategoriesQuery: () => ({
    queryFn: () => Promise.resolve(categoriesRef.current),
    queryKey: CATEGORY_QUERY_KEYS.ALL,
  }),
}))

vi.mock("~/src/hooks/use-landing-animations", () => ({
  useLandingAnimations: () => {},
}))

vi.mock("~/src/presentation/components/custom/pages/categories/categories-index-grid", () => ({
  CategoriesIndexGrid: ({ categories }: { readonly categories: readonly { readonly id: string }[] }): JSX.Element => (
    <div data-testid="categories-grid">{categories.map((category) => category.id).join(",")}</div>
  ),
}))

import { Route } from "~/src/routes/_storefront.categories.index"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const category = (overrides: Partial<ProductCategory["storefrontListItem"]> = {}): ProductCategory["storefrontListItem"] => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: "necklaces",
  id: "category-1",
  image: null,
  metadata: null,
  parentId: null,
  productCount: 4,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": "Necklaces", "pl-PL": "Naszyjniki" },
  updatedAt: EPOCH,
  ...overrides,
})

const categoriesRef: { current: readonly ProductCategory["storefrontListItem"][] } = { current: [] }

const renderCategories = () => {
  const CategoriesPage = Route.options.component
  if (CategoriesPage === undefined) {
    throw new Error("the categories route registered no component")
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(CATEGORY_QUERY_KEYS.ALL, categoriesRef.current)

  return renderWithProviders(<CategoriesPage />, { queryClient })
}

beforeEach(() => {
  categoriesRef.current = []
})

afterEach(cleanup)

describe("storefront categories page", () => {
  it("introduces the page with its translated copy", () => {
    renderCategories()

    expect(screen.getByText("Browse by type")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Categories" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Discover the full range of handcrafted jewelry — from sculptural earrings to statement chokers, each piece shaped in our atelier.",
      ),
    ).toBeInTheDocument()
  })

  it("says there is nothing to browse while the catalogue has no category", () => {
    renderCategories()

    expect(screen.getByText("No categories found.")).toBeInTheDocument()
    expect(screen.queryByTestId("categories-grid")).toBeNull()
  })

  it("hands every category to the grid once there is one", () => {
    categoriesRef.current = [category(), category({ handle: "earrings", id: "category-2" })]
    renderCategories()

    expect(screen.getByTestId("categories-grid")).toHaveTextContent("category-1,category-2")
    expect(screen.queryByText("No categories found.")).toBeNull()
  })
})
