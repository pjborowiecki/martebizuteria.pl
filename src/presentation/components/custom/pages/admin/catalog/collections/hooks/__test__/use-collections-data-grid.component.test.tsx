import { type ReactNode, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

const { collectionRows, reorderRequest } = vi.hoisted(() => ({
  collectionRows: { current: [] as unknown[] },
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
vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  const { COLLECTION_QUERY_KEYS: keys } = await import("~/src/modules/product-collection/product-collection.constants")

  return {
    getAdminCollectionsQuery: () => queryOptions({ queryFn: () => Promise.resolve(collectionRows.current), queryKey: keys.ADMIN.ALL }),
  }
})
vi.mock("~/src/modules/product-collection/use-cases/reorder-collections", () => ({
  reorderCollectionsMutation: {
    mutationFn: (ids: string[]) => {
      reorderRequest(ids)

      return Promise.resolve({ ok: true })
    },
    mutationKey: ["product-collection", "reorderCollections"],
  },
}))

const { useCollectionsDataGrid } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-data-grid")

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const collection = (id: string, overrides: Partial<ProductCollection["adminListItem"]> = {}): ProductCollection["adminListItem"] => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: id,
  id,
  image: null,
  metadata: null,
  productCount: 0,
  rank: 0,
  status: "active",
  titles: { "en-US": id, "pl-PL": id },
  updatedAt: EPOCH,
  ...overrides,
})

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    <Suspense fallback={<output>loading collections</output>}>{children}</Suspense>
  </TestProviders>
)

const renderGrid = async () => {
  const rendered = renderHook(() => useCollectionsDataGrid({}), { wrapper })
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
  collectionRows.current = [
    collection("new-arrivals", { titles: { "en-US": "New arrivals", "pl-PL": "Nowosci" } }),
    collection("sale", { status: "draft", titles: { "en-US": "Sale", "pl-PL": "Wyprzedaz" } }),
  ]
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("useCollectionsDataGrid", () => {
  it("keeps the grid on the collections persistence key with its own search placeholder", async () => {
    const { result } = await renderGrid()

    expect(result.current.persistenceKey).toBe("admin.catalog.collections")
    expect(result.current.searchPlaceholder).toBe("Search collections...")
    expect(result.current.hasPreferenceOverrides).toBe(false)
  })

  it("feeds the table with the collections the query returned", async () => {
    const { result } = await renderGrid()

    expect(visibleIds(result.current.table)).toStrictEqual(["new-arrivals", "sale"])
    expect(result.current.table.getColumn("title")).toBeDefined()
  })

  it("hides the columns the collections table keeps out of view by default", async () => {
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

    expect(visibleIds(result.current.table)).toStrictEqual(["sale"])
  })

  it("searches the rows by a localized title", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("Nowosci")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["new-arrivals"])
  })

  it("keeps no row when the search matches nothing", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("bracelets")
    })

    expect(visibleIds(result.current.table)).toStrictEqual([])
  })
})

describe("useCollectionsDataGrid row reordering", () => {
  it("allows dragging while the table is in its natural order", async () => {
    const { result } = await renderGrid()

    expect(result.current.rowReorder?.enabled).toBe(true)
    expect(result.current.rowReorder?.draggingId).toBeUndefined()
  })

  it("stops dragging while a search narrows the table", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.table.setGlobalFilter("New arrivals")
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
      result.current.rowReorder?.onRowDragStart("sale")
    })

    expect(result.current.rowReorder?.draggingId).toBe("sale")
  })

  it("moves the dragged row in front of the row it is pulled over", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowDragStart("sale")
    })
    act(() => {
      result.current.rowReorder?.onRowDragEnter("new-arrivals")
    })

    expect(visibleIds(result.current.table)).toStrictEqual(["sale", "new-arrivals"])
  })

  it("persists the dragged order once the row is dropped", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowDragStart("sale")
    })
    act(() => {
      result.current.rowReorder?.onRowDragEnter("new-arrivals")
    })
    act(() => {
      result.current.rowReorder?.onRowDrop()
    })

    await waitFor(() => {
      expect(reorderRequest).toHaveBeenCalledWith(["sale", "new-arrivals"])
    })
  })

  it("persists the new order once a row is moved up", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowMove("sale", "up")
    })

    await waitFor(() => {
      expect(reorderRequest).toHaveBeenCalledWith(["sale", "new-arrivals"])
    })
  })

  it("asks for no reorder when the moved row cannot go further", async () => {
    const { result } = await renderGrid()

    act(() => {
      result.current.rowReorder?.onRowMove("new-arrivals", "up")
    })

    expect(reorderRequest).not.toHaveBeenCalled()
  })
})
