import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_TABLE_COLUMN_ID } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { listAuditLogsQuery } from "~/src/modules/audit-log/use-cases/list-audit-logs"

const { listFn } = vi.hoisted(() => ({ listFn: vi.fn<(input: unknown) => Promise<unknown>>() }))

vi.mock("~/src/modules/audit-log/use-cases/list-audit-logs", () => ({
  listAuditLogs: ({ data }: Readonly<{ data: unknown }>) => listFn(data),
  listAuditLogsQuery: (input: unknown) => ({ queryKey: ["admin", "audit-log", "page", input] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-columns", () => ({
  useAuditColumns: () => [
    { accessorKey: "severity", header: "Status", id: AUDIT_LOG_TABLE_COLUMN_ID.severity },
    { accessorKey: "action", header: "Event", id: AUDIT_LOG_TABLE_COLUMN_ID.action },
    { accessorKey: "target", header: "Subject", id: AUDIT_LOG_TABLE_COLUMN_ID.target },
  ],
}))

import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import {
  type AuditDataGridValue,
  useAuditDataGrid,
  useAuditDataGridContext,
} from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid"
import { auditDataGrid } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid"

const auditRow = (overrides: Partial<AuditLog["adminListItem"]> = {}): AuditLog["adminListItem"] => ({
  action: "order.placed",
  actor: { id: "user-1", initials: "AN", name: "Ada Nowak", role: "admin" },
  category: "orders",
  detail: undefined,
  id: "log-1",
  ip: "198.51.100.4",
  resourceId: undefined,
  severity: "info",
  target: "order-1",
  timestamp: "29 Sep 2026, 10:00:00",
  ...overrides,
})

const page = (items: readonly AuditLog["adminListItem"][], total = items.length) => ({
  hasMore: false,
  items,
  limit: ADMIN_AUDIT_LOG_PAGE_SIZE,
  offset: 0,
  total,
})

const pageWithoutTotal = (items: readonly AuditLog["adminListItem"][], offset = 0) => ({
  hasMore: true,
  items,
  limit: ADMIN_AUDIT_LOG_PAGE_SIZE,
  offset,
})

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const renderGrid = () => renderHook(() => useAuditDataGrid(), { wrapper: Wrapper })

const withoutAuditFilter = (value: AuditDataGridValue): DataGridContextValue<AuditLog["adminListItem"]> => ({
  columnReorder: value.columnReorder,
  hasPreferenceOverrides: value.hasPreferenceOverrides,
  isLoading: value.isLoading,
  persistenceKey: value.persistenceKey,
  resetPreferences: value.resetPreferences,
  rowReorder: value.rowReorder,
  searchPlaceholder: value.searchPlaceholder,
  table: value.table,
})

const lastRequest = () => listFn.mock.calls.at(-1)?.[0]

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  listFn.mockResolvedValue(page([auditRow(), auditRow({ id: "log-2", severity: "error" })]))
})

afterEach(cleanup)

describe("useAuditDataGrid page request", () => {
  it("asks for the first page at the audit page size", async () => {
    renderGrid()

    await waitFor(() => {
      expect(listFn).toHaveBeenCalled()
    })

    expect(lastRequest()).toStrictEqual({
      category: undefined,
      createdAt: undefined,
      page: 1,
      pageSize: ADMIN_AUDIT_LOG_PAGE_SIZE,
      search: undefined,
      severity: undefined,
    })
  })

  it("reports loading until the page arrives", async () => {
    const { result } = renderGrid()

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("feeds the fetched entries into the table, keyed by audit log id", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getRowModel().rows).toHaveLength(2)
    })

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["log-1", "log-2"])
  })

  it("derives the page count from the reported total", async () => {
    listFn.mockResolvedValue(page([auditRow()], 250))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
  })

  it("leaves the page count unknown while the server reports no total", async () => {
    listFn.mockResolvedValue(pageWithoutTotal([auditRow()]))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["log-1"])
    })

    expect(result.current.table.getPageCount()).toBe(0)
  })

  it("remembers the last reported total when a later page omits it", async () => {
    listFn.mockResolvedValue(page([auditRow()], 250))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })

    listFn.mockResolvedValue(pageWithoutTotal([auditRow({ id: "log-9" })], ADMIN_AUDIT_LOG_PAGE_SIZE))
    act(() => {
      result.current.table.setPageIndex(1)
    })

    await waitFor(() => {
      expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["log-9"])
    })
    expect(result.current.table.getPageCount()).toBe(3)
  })

  it("shows the first page the route loader cached without a total and leaves the page count unknown", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } } })
    queryClient.setQueryData(
      listAuditLogsQuery({ page: 1, pageSize: ADMIN_AUDIT_LOG_PAGE_SIZE }).queryKey,
      pageWithoutTotal([auditRow({ id: "log-seeded" })]),
    )
    const { result } = renderHook(() => useAuditDataGrid(), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <TestProviders queryClient={queryClient} router={createTestRouter()}>
          {children}
        </TestProviders>
      ),
    })

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["log-seeded"])
    expect(result.current.table.getPageCount()).toBe(0)
    expect(listFn).not.toHaveBeenCalled()
  })
})

describe("useAuditDataGrid context value", () => {
  it("keeps the shared persistence key so column preferences survive a reload", () => {
    const { result } = renderGrid()

    expect(result.current.persistenceKey).toBe(auditDataGrid.persistenceKey)
  })

  it("localizes the search placeholder", () => {
    const { result } = renderGrid()

    expect(result.current.searchPlaceholder).toBe("Search events…")
  })

  it("offers no row reordering for the audit log", () => {
    const { result } = renderGrid()

    expect(result.current.rowReorder).toBeUndefined()
  })

  it("starts with every category and no severity or date narrowed", () => {
    const { result } = renderGrid()

    expect(result.current.activeCategoryFilter).toBe("all")
    expect(result.current.activeSeverityFilter).toBeUndefined()
    expect(result.current.activeDateFilter).toBeUndefined()
  })
})

describe("useAuditDataGrid filters", () => {
  it("narrows the request to a single category", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(listFn).toHaveBeenCalled()
    })
    act(() => {
      result.current.applyAuditFilter({ category: "catalog" })
    })

    expect(result.current.activeCategoryFilter).toBe("catalog")
    await waitFor(() => {
      expect(lastRequest()).toMatchObject({ category: "catalog", page: 1 })
    })
  })

  it.each(["all", undefined] as const)("clears the category with %s without sending a placeholder to the server", async (category) => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyAuditFilter({ category: "catalog" })
    })

    await waitFor(() => {
      expect(lastRequest()).toMatchObject({ category: "catalog" })
    })
    act(() => {
      result.current.applyAuditFilter({ category })
    })

    await waitFor(() => {
      expect(lastRequest()).toMatchObject({ category: undefined })
    })
    expect(result.current.activeCategoryFilter).toBe("all")
  })

  it("narrows the request to a single severity", async () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyAuditFilter({ severity: "error" })
    })

    expect(result.current.activeSeverityFilter).toBe("error")
    await waitFor(() => {
      expect(lastRequest()).toMatchObject({ severity: "error" })
    })
  })

  it("carries a timestamp filter through to the request", async () => {
    const { result } = renderGrid()
    const createdAt = { date: "2026-09-29T00:00", operator: "on" } as const

    act(() => {
      result.current.applyAuditFilter({ createdAt })
    })

    expect(result.current.activeDateFilter).toStrictEqual(createdAt)
    await waitFor(() => {
      expect(lastRequest()).toMatchObject({ createdAt })
    })
  })

  it("keeps the earlier filters when a later patch touches only one of them", async () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyAuditFilter({ category: "auth" })
    })
    act(() => {
      result.current.applyAuditFilter({ severity: "warning" })
    })

    await waitFor(() => {
      expect(lastRequest()).toMatchObject({ category: "auth", severity: "warning" })
    })
  })

  it("leaves everything alone when asked to apply nothing", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(listFn).toHaveBeenCalledTimes(1)
    })
    act(() => {
      result.current.applyAuditFilter()
    })

    expect(result.current.activeCategoryFilter).toBe("all")
    expect(listFn).toHaveBeenCalledTimes(1)
  })

  it("returns to the first page when a filter is applied from a later page", async () => {
    listFn.mockResolvedValue(page([auditRow()], 250))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
    act(() => {
      result.current.table.setPageIndex(1)
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(1)

    act(() => {
      result.current.applyAuditFilter({ severity: "error" })
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)
  })
})

describe("useAuditDataGrid search", () => {
  it("sends the typed term to the server once the typing settles", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(listFn).toHaveBeenCalled()
    })
    act(() => {
      result.current.table.setGlobalFilter("  order.placed  ")
    })

    await waitFor(() => {
      expect(lastRequest()).toMatchObject({ page: 1, search: "order.placed" })
    })
  })

  it("returns to the first page when the search changes", async () => {
    listFn.mockResolvedValue(page([auditRow()], 250))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
    act(() => {
      result.current.table.setPageIndex(2)
    })
    act(() => {
      result.current.table.setGlobalFilter("refund")
    })

    await waitFor(() => {
      expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)
    })
  })
})

describe("useAuditDataGridContext", () => {
  it("refuses to run outside any data grid provider", () => {
    expect(() => renderHook(() => useAuditDataGridContext(), { wrapper: Wrapper })).toThrow(
      "useDataGrid must be used within <DataGrid.Provider>",
    )
  })

  it("refuses a data grid that carries no audit filter", async () => {
    const grid = renderGrid()

    await waitFor(() => {
      expect(grid.result.current.isLoading).toBe(false)
    })

    const value = withoutAuditFilter(grid.result.current)

    expect(() =>
      renderHook(() => useAuditDataGridContext(), {
        wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
          <Wrapper>
            <auditDataGrid.Provider value={value}>{children}</auditDataGrid.Provider>
          </Wrapper>
        ),
      }),
    ).toThrow("useAuditDataGridContext must be used within the audit table Provider.")
  })

  it("exposes the audit filters when the provider carries them", async () => {
    const grid = renderGrid()

    await waitFor(() => {
      expect(grid.result.current.isLoading).toBe(false)
    })

    const value = grid.result.current
    const { result } = renderHook(() => useAuditDataGridContext(), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <Wrapper>
          <auditDataGrid.Provider value={value}>{children}</auditDataGrid.Provider>
        </Wrapper>
      ),
    })

    expect(result.current.activeCategoryFilter).toBe("all")
    expect(result.current.persistenceKey).toBe(auditDataGrid.persistenceKey)
  })
})
