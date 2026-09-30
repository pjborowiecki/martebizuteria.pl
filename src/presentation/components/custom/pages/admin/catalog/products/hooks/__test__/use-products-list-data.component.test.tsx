import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type ProductVariantKind } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { useProductsListData } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-list-data"

const product = (id: string, rank: number): Product["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: `handle-${id}`,
  id,
  inventoryLevel: "ok",
  metadata: null,
  primaryCategoryId: null,
  rank,
  status: "published",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": `Product ${id}`, "pl-PL": `Produkt ${id}` },
  totalStock: 3,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  variantCount: 1,
})

const queries = vi.hoisted(() => ({
  pageInputs: [] as Record<string, unknown>[],
}))

const fixtures = vi.hoisted(() => ({
  all: { current: [] as unknown[] },
  page: { current: { hasMore: false, items: [] as unknown[], limit: 25, offset: 0, total: 0 } },
}))

vi.mock("~/src/modules/product/use-cases/get-admin-products", () => ({
  getAdminProductsQuery: () => queryOptions({ queryFn: () => fixtures.all.current, queryKey: ["admin-products", "all"] as const }),
}))
vi.mock("~/src/modules/product/use-cases/get-admin-products-page", () => ({
  getAdminProductsPageQuery: (input: Record<string, unknown>) => {
    queries.pageInputs.push(input)

    return queryOptions({ queryFn: () => fixtures.page.current, queryKey: ["admin-products", "page", input] as const })
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-reorder-products", () => ({
  useReorderProducts: () => ({ isPending: false, mutate: vi.fn<(ids: string[]) => void>() }),
}))

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)

const options = (hasServerListQuery: boolean) => ({
  columnFilters: {},
  filters: {},
  hasServerListQuery,
  pagination: { pageIndex: 2, pageSize: 25 },
})

describe("useProductsListData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queries.pageInputs.length = 0
    fixtures.all.current = [product("a", 0), product("b", 1)]
    fixtures.page.current = { hasMore: true, items: [product("c", 0)], limit: 25, offset: 50, total: 57 }
  })

  afterEach(() => {
    cleanup()
  })

  it("serves the client list and leaves the server counts unset", async () => {
    const { result } = renderHook(() => useProductsListData(options(false)), { wrapper })

    await waitFor(() => {
      expect(result.current.tableData).toHaveLength(2)
    })
    expect(result.current.tableData.map((row) => row.id)).toStrictEqual(["a", "b"])
    expect(result.current.pageCount).toBeUndefined()
    expect(result.current.rowCount).toBeUndefined()
  })

  it("serves the server page and derives the page and row counts from the total", async () => {
    const { result } = renderHook(() => useProductsListData(options(true)), { wrapper })

    await waitFor(() => {
      expect(result.current.tableData).toHaveLength(1)
    })
    expect(result.current.tableData.map((row) => row.id)).toStrictEqual(["c"])
    expect(result.current.rowCount).toBe(57)
    expect(result.current.pageCount).toBe(3)
  })

  it("asks the server for the one based page that matches the zero based table index", () => {
    renderHook(() => useProductsListData(options(true)), { wrapper })

    expect(queries.pageInputs[0]).toMatchObject({ page: 3, pageSize: 25 })
  })

  it("forwards the grid filters and the column filters to the server query", () => {
    renderHook(
      () =>
        useProductsListData({
          columnFilters: { totalStock: { amountMinorUnits: 10, operator: "gte" } },
          filters: { status: "draft" },
          hasServerListQuery: true,
          pagination: { pageIndex: 0, pageSize: 25 },
          search: "ring",
        }),
      { wrapper },
    )

    expect(queries.pageInputs[0]).toMatchObject({
      search: "ring",
      status: "draft",
      totalStock: { amountMinorUnits: 10, operator: "gte" },
    })
  })

  it("updates and clears the variant-kind filter in server page requests", () => {
    const initialProps: { variantKind: ProductVariantKind | undefined } = { variantKind: "single" }
    const { rerender } = renderHook(
      ({ variantKind }) =>
        useProductsListData({
          ...options(true),
          filters: variantKind === undefined ? { status: "draft" } : { status: "draft", variantKind },
        }),
      { initialProps, wrapper },
    )

    expect(queries.pageInputs.at(-1)).toMatchObject({ page: 3, pageSize: 25, status: "draft", variantKind: "single" })

    rerender({ variantKind: "multi" })

    expect(queries.pageInputs.at(-1)).toMatchObject({ page: 3, pageSize: 25, status: "draft", variantKind: "multi" })

    rerender({ variantKind: undefined })

    expect(queries.pageInputs.at(-1)).toMatchObject({ status: "draft", variantKind: undefined })
  })

  it("shows skeleton rows until the client list resolves", async () => {
    const { result } = renderHook(() => useProductsListData(options(false)), { wrapper })

    expect(result.current.showSkeletonRows).toBe(true)

    await waitFor(() => {
      expect(result.current.showSkeletonRows).toBe(false)
    })
  })

  it("shows skeleton rows until the server page resolves", async () => {
    const { result } = renderHook(() => useProductsListData(options(true)), { wrapper })

    expect(result.current.showSkeletonRows).toBe(true)

    await waitFor(() => {
      expect(result.current.showSkeletonRows).toBe(false)
    })
  })

  it("keeps the ordering list empty while the server owns the order", async () => {
    const { result } = renderHook(() => useProductsListData(options(true)), { wrapper })

    await waitFor(() => {
      expect(result.current.tableData).toHaveLength(1)
    })
    expect(result.current.ordering.items).toStrictEqual([])
  })

  it("falls back to an empty page when the server query is switched off", () => {
    const { result } = renderHook(() => useProductsListData(options(false)), { wrapper })

    expect(result.current.tableData).toStrictEqual([])
  })

  it("holds the ordering list steady across renders while the server owns the order", async () => {
    const { rerender, result } = renderHook(() => useProductsListData(options(true)), { wrapper })

    await waitFor(() => {
      expect(result.current.tableData).toHaveLength(1)
    })

    const firstItems = result.current.ordering.items
    rerender()
    rerender()

    expect(result.current.ordering.items).toBe(firstItems)
  })
})
