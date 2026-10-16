import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Product } from "~/src/modules/product/product.types"

const CATEGORIES = [{ id: "category-1", titles: { "en-US": "Rings", "pl-PL": "Pierścionki" } }]

const COLLECTIONS = [{ id: "collection-1", titles: { "en-US": "New arrivals", "pl-PL": "Nowości" } }]

const { categoriesFn, collectionsFn, exportFn } = vi.hoisted(() => ({
  categoriesFn: vi.fn<() => Promise<unknown>>(),
  collectionsFn: vi.fn<() => Promise<unknown>>(),
  exportFn: vi.fn<(input: unknown) => Promise<unknown>>(),
}))

vi.mock("~/src/modules/product/use-cases/export-admin-products", () => ({
  exportAdminProducts: ({ data }: Readonly<{ data: unknown }>) => exportFn(data),
}))
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () => ({ queryFn: categoriesFn, queryKey: ["admin", "categories"] }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({
  getAdminCollectionsQuery: () => ({ queryFn: collectionsFn, queryKey: ["admin", "collections"] }),
}))

import { useProductsExportSource } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-export-source"

const cachedCatalog = (): QueryClient => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(["admin", "categories"], CATEGORIES)
  queryClient.setQueryData(["admin", "collections"], COLLECTIONS)

  return queryClient
}

const renderSource = (input: Product["adminProductsExportInput"], loadsFromServer = true, queryClient = cachedCatalog()) =>
  renderHook(() => useProductsExportSource(input, loadsFromServer), {
    wrapper: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
      <TestProviders queryClient={queryClient} router={createTestRouter()}>
        {children}
      </TestProviders>
    ),
  }).result

const sourceFor = (input: Product["adminProductsExportInput"], loadsFromServer = true) => renderSource(input, loadsFromServer).current

beforeEach(() => {
  vi.clearAllMocks()
  categoriesFn.mockResolvedValue(CATEGORIES)
  collectionsFn.mockResolvedValue(COLLECTIONS)
})

afterEach(cleanup)

describe("useProductsExportSource", () => {
  it("names the products list and its title", () => {
    expect(sourceFor({})).toMatchObject({ filters: [], list: "products", title: "Products" })
  })

  it("names the category and the collection by their titles", () => {
    expect(sourceFor({ categoryId: "category-1", collectionId: "collection-1" }).filters).toStrictEqual([
      { label: "Categories", value: "Rings" },
      { label: "Collections", value: "New arrivals" },
    ])
  })

  it("loads the categories and collections to name them when the page has not loaded them yet", async () => {
    const result = renderSource({ categoryId: "category-1", collectionId: "collection-1" }, true, new QueryClient())

    await waitFor(() => {
      expect(result.current.filters).toStrictEqual([
        { label: "Categories", value: "Rings" },
        { label: "Collections", value: "New arrivals" },
      ])
    })
    expect(categoriesFn).toHaveBeenCalledOnce()
    expect(collectionsFn).toHaveBeenCalledOnce()
  })

  it("loads neither list while no category or collection is filtered", () => {
    sourceFor({ status: "draft" })

    expect(categoriesFn).not.toHaveBeenCalled()
    expect(collectionsFn).not.toHaveBeenCalled()
  })

  it("keeps the id of a category or collection that no longer exists", () => {
    expect(sourceFor({ categoryId: "category-9", collectionId: "collection-9" }).filters).toStrictEqual([
      { label: "Categories", value: "category-9" },
      { label: "Collections", value: "collection-9" },
    ])
  })

  it("describes the status, the variants and the stock level by their labels", () => {
    expect(sourceFor({ inventoryLevel: "low", status: "draft", variantKind: "multi" }).filters).toStrictEqual([
      { label: "Status", value: "Draft" },
      { label: "Variants", value: "Multiple variants" },
      { label: "Stock level", value: "Low stock" },
    ])
  })

  it.each([
    ["ok", "In stock"],
    ["out", "Out of stock"],
  ] as const)("names the %s stock level", (inventoryLevel, label) => {
    expect(sourceFor({ inventoryLevel }).filters).toStrictEqual([{ label: "Stock level", value: label }])
  })

  it("describes the price in the shop currency, the stock as a count and the date in words", () => {
    const { filters } = sourceFor({
      createdAt: { date: "2026-10-01", operator: "on" },
      minPrice: { amountMinorUnits: 10_000, operator: "lte" },
      totalStock: { endAmountMinorUnits: 2000, operator: "between", startAmountMinorUnits: 5 },
    })

    expect(filters).toStrictEqual([
      { label: "Price", value: `at most ${formatPrice(10_000, "PLN", "en-US")}` },
      { label: "Stock", value: "from 5 to 2,000" },
      { label: "Created at", value: "on Oct 1, 2026" },
    ])
  })

  it("loads the export from the server while the list is queried there", async () => {
    exportFn.mockResolvedValue([])
    const input = { search: "ring", status: "published" } as const

    await sourceFor(input).loadRows?.()

    expect(exportFn).toHaveBeenCalledExactlyOnceWith(input)
  })

  it("reports the search it sends to the server", () => {
    expect(sourceFor({ search: "ring" }).search).toBe("ring")
    expect(sourceFor({}).search).toBeUndefined()
  })

  it("exports the rows the grid holds while it shows the whole catalog", () => {
    expect(sourceFor({}, false).loadRows).toBeUndefined()
  })
})
