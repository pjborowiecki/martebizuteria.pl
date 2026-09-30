import { type ReactNode, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import {
  ADMIN_PRODUCT_ATTRIBUTES_PAGE_SIZE,
  PRODUCT_ATTRIBUTE_STAT_FILTER,
  PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID,
  PRODUCT_ATTRIBUTE_TYPE,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

type AttributeRow = ProductAttribute["adminListItem"]

const { attributeRows, reorderRequest } = vi.hoisted(() => ({
  attributeRows: { current: [] as unknown[] },
  reorderRequest: vi.fn<(ids: string[]) => void>(),
}))

vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: {}, handler: vi.fn() } }))
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
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { drizzle } = await import("drizzle-orm/sqlite-proxy")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")

  return { db: drizzle(() => Promise.resolve({ rows: [] }), { schema }) }
})
vi.mock("~/src/modules/product-attribute/use-cases/get-admin-product-attributes", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  const { PRODUCT_ATTRIBUTE_QUERY_KEYS: keys } = await import("~/src/modules/product-attribute/product-attribute.constants")

  return {
    getAdminProductAttributesQuery: () => queryOptions({ queryFn: () => Promise.resolve(attributeRows.current), queryKey: keys.ADMIN.ALL }),
  }
})
vi.mock("~/src/modules/product-attribute/use-cases/reorder-product-attributes", () => ({
  reorderProductAttributesMutation: {
    mutationFn: (ids: string[]) => {
      reorderRequest(ids)

      return Promise.resolve({ ok: true })
    },
    mutationKey: ["product-attribute", "reorder"],
  },
}))

const { useAttributesDataGrid, useAttributesDataGridContext } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid")
const { attributesDataGrid } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid")

const CREATED_AT = new Date("2026-01-15T10:00:00.000Z")

const attribute = (id: string, overrides: Partial<AttributeRow> = {}): AttributeRow => ({
  allowedValues: null,
  createdAt: CREATED_AT,
  handle: id,
  id,
  productCount: 0,
  rank: 0,
  titles: { "en-US": id, "pl-PL": id },
  type: PRODUCT_ATTRIBUTE_TYPE.TEXT,
  unit: null,
  updatedAt: CREATED_AT,
  ...overrides,
})

const material = (): AttributeRow =>
  attribute("material", {
    allowedValues: [
      { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" },
      { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
    ],
    productCount: 12,
    titles: { "en-US": "Material", "pl-PL": "Materiał" },
    type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
  })

const length = (): AttributeRow =>
  attribute("length", {
    titles: { "en-US": "Length", "pl-PL": "Długość" },
    type: PRODUCT_ATTRIBUTE_TYPE.NUMBER,
    unit: "cm",
  })

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    <Suspense fallback={<output>loading attributes</output>}>{children}</Suspense>
  </TestProviders>
)

const renderGrid = async () => {
  const rendered = renderHook(() => useAttributesDataGrid({}), { wrapper })
  await waitFor(() => {
    expect(rendered.result.current.isLoading).toBe(false)
  })

  return rendered
}

type AttributesGrid = Awaited<ReturnType<typeof renderGrid>>["result"]["current"]

const visibleIds = (table: AttributesGrid["table"]): string[] => table.getFilteredRowModel().rows.map((row) => row.original.id)

const orderedIds = (table: AttributesGrid["table"]): string[] => table.getCoreRowModel().rows.map((row) => row.original.id)

beforeEach(() => {
  localStorage.clear()
  reorderRequest.mockClear()
  attributeRows.current = [material(), length()]
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("useAttributesDataGrid", () => {
  it("keeps the grid on the attributes persistence key with its own search placeholder", async () => {
    const { result } = await renderGrid()

    expect(result.current.persistenceKey).toBe(attributesDataGrid.persistenceKey)
    expect(result.current.searchPlaceholder).toBe("Search attributes...")
    expect(result.current.hasPreferenceOverrides).toBe(false)
  })

  it("feeds the table with the attributes the query returned, keyed by their id", async () => {
    const { result } = await renderGrid()

    expect(orderedIds(result.current.table)).toStrictEqual(["material", "length"])
    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["material", "length"])
  })

  it("hides the columns the attributes table keeps out of view by default", async () => {
    const { result } = await renderGrid()

    expect(result.current.table.getColumn(PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.editedAt)?.getIsVisible()).toBe(false)
    expect(result.current.table.getColumn(PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.recordId)?.getIsVisible()).toBe(false)
    expect(result.current.table.getColumn(PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.type)?.getIsVisible()).toBe(true)
  })

  it("pins the selection, drag and title columns left and the actions column right", async () => {
    const { result } = await renderGrid()

    expect(result.current.table.atoms.columnPinning.get()).toStrictEqual({
      end: ["actions"],
      start: ["select", "drag", "title"],
    })
  })

  it("paginates at the configured admin page size", async () => {
    attributeRows.current = Array.from({ length: 60 }, (_, index) => attribute(`attribute-${index}`))
    const { result } = await renderGrid()

    expect(result.current.table.atoms.pagination.get().pageSize).toBe(ADMIN_PRODUCT_ATTRIBUTES_PAGE_SIZE)
    expect(result.current.table.getRowModel().rows).toHaveLength(ADMIN_PRODUCT_ATTRIBUTES_PAGE_SIZE)
  })
})

describe("useAttributesDataGrid search", () => {
  it("searches the rows by a localized title", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Materiał")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["material"])
  })

  it("searches the rows by their translated type label", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Single choice")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["material"])
  })

  it("searches the rows by an allowed value label", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Silver")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["material"])
  })

  it("searches the rows by their unit", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("cm")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["length"])
  })

  it("keeps no row when the search matches nothing", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("engraving")
    })

    expect(visibleIds(result.current.table)).toStrictEqual([])
  })
})

describe("useAttributesDataGrid stat filters", () => {
  it("starts with the whole catalogue and no stat filter", async () => {
    const { result } = await renderGrid()

    expect(result.current.activeStatFilter).toBeUndefined()
    expect(orderedIds(result.current.table)).toStrictEqual(["material", "length"])
  })

  it("keeps only the attributes in use", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.applyAttributeStatFilter(PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE)
    })

    await waitFor(() => {
      expect(orderedIds(result.current.table)).toStrictEqual(["material"])
    })
    expect(result.current.activeStatFilter).toBe(PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE)
  })

  it("keeps only the unused attributes", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.applyAttributeStatFilter(PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED)
    })

    await waitFor(() => {
      expect(orderedIds(result.current.table)).toStrictEqual(["length"])
    })
  })

  it("keeps only the attributes that carry a choice list", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.applyAttributeStatFilter(PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE)
    })

    await waitFor(() => {
      expect(orderedIds(result.current.table)).toStrictEqual(["material"])
    })
  })

  it("restores the whole catalogue once the stat filter is cleared", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.applyAttributeStatFilter(PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED)
    })
    act(() => {
      result.current.applyAttributeStatFilter()
    })

    await waitFor(() => {
      expect(orderedIds(result.current.table)).toStrictEqual(["material", "length"])
    })
    expect(result.current.activeStatFilter).toBeUndefined()
  })

  it("returns to the first page when a stat filter is applied from a later page", async () => {
    attributeRows.current = Array.from({ length: 60 }, (_, index) => attribute(`attribute-${index}`))
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setPageIndex(1)
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(1)

    act(() => {
      result.current.applyAttributeStatFilter(PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED)
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)
  })
})

describe("useAttributesDataGrid row reordering", () => {
  it("allows dragging while the table is in its natural order", async () => {
    const { result } = await renderGrid()

    expect(result.current.rowReorder?.enabled).toBe(true)
    expect(result.current.rowReorder?.draggingId).toBeUndefined()
  })

  it("stops dragging while a search narrows the table", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Material")
    })

    expect(result.current.rowReorder?.enabled).toBe(false)
  })

  it("stops dragging while the table is sorted", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setSorting([{ desc: true, id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.title }])
    })

    expect(result.current.rowReorder?.enabled).toBe(false)
  })

  it("stops dragging while a stat filter hides part of the catalogue", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.applyAttributeStatFilter(PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE)
    })

    await waitFor(() => {
      expect(result.current.rowReorder?.enabled).toBe(false)
    })
  })

  it("reports the row being dragged", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowDragStart("length")
    })

    expect(result.current.rowReorder?.draggingId).toBe("length")
  })

  it("moves the dragged row in front of the row it entered", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowDragStart("length")
    })
    act(() => {
      result.current.rowReorder?.onRowDragEnter("material")
    })

    expect(orderedIds(result.current.table)).toStrictEqual(["length", "material"])
  })

  it("persists the new order once the dragged row is dropped", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowDragStart("length")
    })
    act(() => {
      result.current.rowReorder?.onRowDragEnter("material")
    })
    act(() => {
      result.current.rowReorder?.onRowDrop()
    })

    await waitFor(() => {
      expect(reorderRequest).toHaveBeenCalledWith(["length", "material"])
    })
    expect(result.current.rowReorder?.draggingId).toBeUndefined()
  })

  it("persists the new order once a row is moved up with the keyboard", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowMove("length", "up")
    })

    await waitFor(() => {
      expect(reorderRequest).toHaveBeenCalledWith(["length", "material"])
    })
  })

  it("asks for no reorder when the moved row cannot go further", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowMove("material", "up")
    })

    expect(reorderRequest).not.toHaveBeenCalled()
  })
})

describe("useAttributesDataGridContext", () => {
  it("refuses to run outside any data grid provider", () => {
    expect(() => renderHook(() => useAttributesDataGridContext(), { wrapper })).toThrow(
      "useDataGrid must be used within <DataGrid.Provider>",
    )
  })

  it("refuses a data grid provider that carries no attribute stat filter", async () => {
    const grid = await renderGrid()
    const value = grid.result.current
    const withoutStatFilter = {
      columnReorder: value.columnReorder,
      hasPreferenceOverrides: value.hasPreferenceOverrides,
      isLoading: value.isLoading,
      persistenceKey: value.persistenceKey,
      resetPreferences: value.resetPreferences,
      rowReorder: value.rowReorder,
      searchPlaceholder: value.searchPlaceholder,
      table: value.table,
    }

    expect(() =>
      renderHook(() => useAttributesDataGridContext(), {
        wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
          <attributesDataGrid.Provider value={withoutStatFilter}>{children}</attributesDataGrid.Provider>
        ),
      }),
    ).toThrow("useAttributesDataGridContext must be used within the attributes table Provider.")
  })

  it("exposes the attributes value when the provider carries one", async () => {
    const grid = await renderGrid()
    const value = grid.result.current
    const { result } = renderHook(() => useAttributesDataGridContext(), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <attributesDataGrid.Provider value={value}>{children}</attributesDataGrid.Provider>
      ),
    })

    expect(result.current.persistenceKey).toBe(attributesDataGrid.persistenceKey)
    expect(result.current.applyAttributeStatFilter).toBe(value.applyAttributeStatFilter)
  })
})
