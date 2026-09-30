import { type ReactNode, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

const { categoryRows, reorderRequest } = vi.hoisted(() => ({
  categoryRows: { current: [] as unknown[] },
  reorderRequest: vi.fn<(ids: string[]) => void>(),
}))

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
vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: {}, handler: vi.fn() } }))
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://cdn.example.test",
  getAssetURL: (path: string) => `https://cdn.example.test/${path}`,
  getBaseURL: () => "https://shop.example.test",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  const { CATEGORY_QUERY_KEYS: keys } = await import("~/src/modules/product-category/product-category.constants")

  return {
    getAdminCategoriesQuery: () => queryOptions({ queryFn: () => Promise.resolve(categoryRows.current), queryKey: keys.ADMIN.ALL }),
  }
})
vi.mock("~/src/modules/product-category/use-cases/reorder-categories", () => ({
  reorderCategoriesMutation: {
    mutationFn: (ids: string[]) => {
      reorderRequest(ids)

      return Promise.resolve({ ok: true })
    },
    mutationKey: ["productCategory", "reorder"],
  },
}))

const { useCategoriesDataGrid } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-data-grid")

const category = (id: string, overrides: Partial<ProductCategory["adminListItem"]> = {}): ProductCategory["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: id,
  id,
  image: null,
  metadata: null,
  parentId: null,
  productCount: 0,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": id, "pl-PL": id },
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    <Suspense fallback={<output>loading categories</output>}>{children}</Suspense>
  </TestProviders>
)

const renderGrid = async () => {
  const rendered = renderHook(() => useCategoriesDataGrid({}), { wrapper })
  await waitFor(() => {
    expect(rendered.result.current.isLoading).toBe(false)
  })

  return rendered
}

const visibleIds = (table: Awaited<ReturnType<typeof renderGrid>>["result"]["current"]["table"]): string[] =>
  table.getFilteredRowModel().rows.map((row) => row.original.id)

beforeEach(() => {
  localStorage.clear()
  reorderRequest.mockClear()
  categoryRows.current = [
    category("necklaces", { titles: { "en-US": "Necklaces", "pl-PL": "Naszyjniki" } }),
    category("rings", { status: "draft", titles: { "en-US": "Rings", "pl-PL": "Pierścionki" } }),
  ]
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("useCategoriesDataGrid", () => {
  it("keeps the grid on the categories persistence key with its own search placeholder", async () => {
    const { result } = await renderGrid()

    expect(result.current.persistenceKey).toBe("admin.catalog.categories")
    expect(result.current.searchPlaceholder).toBe("Search categories...")
    expect(result.current.hasPreferenceOverrides).toBe(false)
  })

  it("feeds the table with the categories the query returned", async () => {
    const { result } = await renderGrid()

    expect(visibleIds(result.current.table)).toStrictEqual(["necklaces", "rings"])
    expect(result.current.table.getColumn("title")).toBeDefined()
  })

  it("hides the columns the categories table keeps out of view by default", async () => {
    const { result } = await renderGrid()

    expect(result.current.table.getColumn("editedAt")?.getIsVisible()).toBe(false)
    expect(result.current.table.getColumn("recordId")?.getIsVisible()).toBe(false)
  })

  it("pins the selection side and the actions side of the table", async () => {
    const { result } = await renderGrid()

    expect(result.current.table.atoms.columnPinning.get()).toStrictEqual({
      end: ["actions"],
      start: ["select", "drag", "image", "title"],
    })
  })

  it("searches the rows by their translated status label", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Draft")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["rings"])
  })

  it("searches the rows by a localized title", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Naszyjniki")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["necklaces"])
  })

  it("keeps no row when the search matches nothing", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("bracelets")
    })

    expect(visibleIds(result.current.table)).toStrictEqual([])
  })
})

describe("useCategoriesDataGrid row reordering", () => {
  it("allows dragging while the table is in its natural order", async () => {
    const { result } = await renderGrid()

    expect(result.current.rowReorder?.enabled).toBe(true)
    expect(result.current.rowReorder?.draggingId).toBeUndefined()
  })

  it("stops dragging while a search narrows the table", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Necklaces")
    })

    expect(result.current.rowReorder?.enabled).toBe(false)
  })

  it("stops dragging while the table is sorted", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setSorting([{ desc: true, id: "title" }])
    })

    expect(result.current.rowReorder?.enabled).toBe(false)
  })

  it("stops dragging while a column filter is applied", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.getColumn("status")?.setFilterValue("draft")
    })

    expect(result.current.rowReorder?.enabled).toBe(false)
  })

  it("reports the row being dragged", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowDragStart("rings")
    })

    expect(result.current.rowReorder?.draggingId).toBe("rings")
  })

  it("persists the new order once a row is moved up", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowMove("rings", "up")
    })

    await waitFor(() => {
      expect(reorderRequest).toHaveBeenCalledWith(["rings", "necklaces"])
    })
  })

  it("asks for no reorder when the moved row cannot go further", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowMove("necklaces", "up")
    })

    expect(reorderRequest).not.toHaveBeenCalled()
  })
})
