import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { createColumnHelper, useTable } from "@tanstack/react-table"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_PRODUCTS_PAGE_SIZE } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { productsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"

vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: {}, handler: vi.fn() } }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { drizzle } = await import("drizzle-orm/sqlite-proxy")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")

  return { db: drizzle(() => Promise.resolve({ rows: [] }), { schema }) }
})
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: vi.fn(() => Promise.resolve(undefined)),
  scheduleRealtimeInvalidation: vi.fn<() => void>(),
}))
vi.mock("~/src/modules/audit-log/audit-log.record.server", () => ({
  SYSTEM_AUDIT_ACTOR: { id: "system", name: "System", type: "system" },
  resolveRequestAuditActor: vi.fn(() => Promise.resolve(undefined)),
  resolveRequestAuditIp: vi.fn<() => string | undefined>(),
  scheduleAuditLog: vi.fn<() => void>(),
  scheduleAuditLogFromRequest: vi.fn<() => void>(),
  scheduleSystemAuditLog: vi.fn<() => void>(),
}))
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://cdn.example.test",
  getAssetURL: (path: string) => `https://cdn.example.test/${path}`,
  getBaseURL: () => "https://shop.example.test",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
const listData = vi.hoisted(() => ({ rows: 0, search: undefined as string | undefined }))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-list-data", () => ({
  useProductsListData: ({ search }: Readonly<{ search?: string }>) => {
    listData.search = search

    return {
      ordering: {
        draggingId: undefined,
        handleDragEnter: vi.fn<(overId: string) => void>(),
        handleDragStart: vi.fn<(id: string) => void>(),
        handleDrop: vi.fn<() => void>(),
        handleMove: vi.fn<(id: string, direction: "up" | "down") => void>(),
        items: [],
      },
      pageCount: undefined,
      rowCount: undefined,
      showSkeletonRows: false,
      tableData: Array.from({ length: listData.rows }, (_, index) => ({ id: `product-${index}` })),
    }
  },
}))

const { useProductsDataGrid, useProductsDataGridContext } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid")

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    {children}
  </TestProviders>
)

const renderGrid = () => renderHook(() => useProductsDataGrid({}), { wrapper })

const ProductsGridProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <productsDataGrid.Provider value={useProductsDataGrid({})}>{children}</productsDataGrid.Provider>
)

const columnHelper = createColumnHelper<DataGridFeatures, Product["adminListItem"]>()

const PLAIN_COLUMNS = columnHelper.columns([columnHelper.accessor("handle", { header: "Handle" })])

const PlainGridProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const table = useTable<DataGridFeatures, Product["adminListItem"]>({
    columns: PLAIN_COLUMNS,
    data: [],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })
  const value: DataGridContextValue<Product["adminListItem"]> = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading: false,
    persistenceKey: productsDataGrid.persistenceKey,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search products",
    table,
  }

  return <productsDataGrid.Provider value={value}>{children}</productsDataGrid.Provider>
}

const renderContext = (Provider: (props: Readonly<{ children: ReactNode }>) => JSX.Element) =>
  renderHook(() => useProductsDataGridContext(), {
    wrapper: ({ children }: Readonly<{ children: ReactNode }>) => wrapper({ children: <Provider>{children}</Provider> }),
  })

beforeEach(() => {
  listData.rows = 0
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("useProductsDataGrid", () => {
  it("starts unfiltered and served from the client", () => {
    const { result } = renderGrid()

    expect(result.current.hasServerListQuery).toBe(false)
    expect(result.current.activeStatusFilter).toBeUndefined()
    expect(result.current.activeCategoryFilter).toBeUndefined()
    expect(result.current.searchPlaceholder).toBe("Search products, SKU, or ID...")
  })

  it("moves the list to the server as soon as a toolbar facet is applied", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyProductsFilter({ status: "draft" })
    })

    expect(result.current.activeStatusFilter).toBe("draft")
    expect(result.current.hasServerListQuery).toBe(true)
  })

  it("merges a second facet into the active filters", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyProductsFilter({ status: "draft" })
    })
    act(() => {
      result.current.applyProductsFilter({ categoryId: "cat-1" })
    })

    expect(result.current.activeStatusFilter).toBe("draft")
    expect(result.current.activeCategoryFilter).toBe("cat-1")
  })

  it("drops a single facet when it is applied as undefined", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyProductsFilter({ inventoryLevel: "low", status: "draft" })
    })
    act(() => {
      result.current.applyProductsFilter({ status: undefined })
    })

    expect(result.current.activeStatusFilter).toBeUndefined()
    expect(result.current.activeInventoryFilter).toBe("low")
  })

  it("clears every facet when the filter is applied with no patch", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyProductsFilter({ collectionId: "col-1", status: "draft", variantKind: "single" })
    })
    act(() => {
      result.current.applyProductsFilter()
    })

    expect(result.current.activeStatusFilter).toBeUndefined()
    expect(result.current.activeCollectionFilter).toBeUndefined()
    expect(result.current.activeVariantKindFilter).toBeUndefined()
    expect(result.current.hasServerListQuery).toBe(false)
  })

  it("carries the active facets into the export input and leaves an empty search out", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyProductsFilter({ categoryId: "cat-1", inventoryLevel: "out", status: "published" })
    })

    expect(result.current.exportListInput).toMatchObject({
      categoryId: "cat-1",
      inventoryLevel: "out",
      status: "published",
    })
    expect(result.current.exportListInput.search).toBeUndefined()
  })
})

describe("useProductsDataGrid rows, search and pagination", () => {
  it("keeps the grid on its own persistence key and exposes the table", () => {
    const { result } = renderGrid()

    expect(result.current.persistenceKey).toBe("admin.catalog.products:v2")
    expect(result.current.table.getAllColumns().length).toBeGreaterThan(0)
    expect(result.current.isLoading).toBe(false)
  })

  it("preserves product identities in the table row model", () => {
    listData.rows = 2
    const { result } = renderGrid()

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["product-0", "product-1"])
  })

  it("debounces and trims the search shared by the server list and export", async () => {
    const { result } = renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("  Silver ring  ")
    })

    await waitFor(() => {
      expect(result.current.hasServerListQuery).toBe(true)
      expect(result.current.exportListInput.search).toBe("Silver ring")
      expect(listData.search).toBe("Silver ring")
    })

    act(() => {
      result.current.table.setGlobalFilter("")
    })

    await waitFor(() => {
      expect(result.current.hasServerListQuery).toBe(false)
      expect(result.current.exportListInput.search).toBeUndefined()
      expect(listData.search).toBeUndefined()
    })
  })

  it("shows an unfiltered catalogue on a single page, however long it is", () => {
    listData.rows = ADMIN_PRODUCTS_PAGE_SIZE + 5
    const { result } = renderGrid()

    expect(result.current.table.atoms.pagination.get().pageSize).toBe(ADMIN_PRODUCTS_PAGE_SIZE + 5)
  })

  it("keeps the admin page size when the catalogue is shorter than one page", () => {
    listData.rows = 5
    const { result } = renderGrid()

    expect(result.current.table.atoms.pagination.get().pageSize).toBe(ADMIN_PRODUCTS_PAGE_SIZE)
  })

  it("returns to the first page when an unfiltered catalogue shrinks below the current page", () => {
    listData.rows = ADMIN_PRODUCTS_PAGE_SIZE + 5
    const { rerender, result } = renderGrid()
    act(() => {
      result.current.table.setPageSize(ADMIN_PRODUCTS_PAGE_SIZE)
    })
    act(() => {
      result.current.table.setPageIndex(1)
    })

    expect(result.current.table.atoms.pagination.get()).toStrictEqual({ pageIndex: 1, pageSize: ADMIN_PRODUCTS_PAGE_SIZE })

    listData.rows = 5
    rerender()

    expect(result.current.hasServerListQuery).toBe(false)
    expect(result.current.table.atoms.pagination.get()).toStrictEqual({ pageIndex: 0, pageSize: ADMIN_PRODUCTS_PAGE_SIZE })
    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual([
      "product-0",
      "product-1",
      "product-2",
      "product-3",
      "product-4",
    ])
  })

  it("returns to the admin page size once the server starts paging the list", () => {
    listData.rows = ADMIN_PRODUCTS_PAGE_SIZE + 5
    const { result } = renderGrid()

    act(() => {
      result.current.applyProductsFilter({ status: "draft" })
    })

    expect(result.current.table.atoms.pagination.get().pageSize).toBe(ADMIN_PRODUCTS_PAGE_SIZE)
  })

  it("mirrors the toolbar status facet onto the status column filter", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyProductsFilter({ status: "draft" })
    })

    expect(result.current.table.getColumn("status")?.getFilterValue()).toBe("draft")
  })
})

describe("useProductsDataGridContext", () => {
  it("hands the products grid value to anything inside the products provider", () => {
    const { result } = renderContext(ProductsGridProvider)

    act(() => {
      result.current.applyProductsFilter({ status: "archived" })
    })

    expect(result.current.activeStatusFilter).toBe("archived")
    expect(result.current.searchPlaceholder).toBe("Search products, SKU, or ID...")
  })

  it("refuses a grid that is not the products grid", () => {
    expect(() => renderContext(PlainGridProvider)).toThrow("useProductsDataGridContext must be used within the products table Provider.")
  })
})
