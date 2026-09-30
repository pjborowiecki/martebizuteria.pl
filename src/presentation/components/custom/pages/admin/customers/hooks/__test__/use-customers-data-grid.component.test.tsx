import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"

const { pageFn } = vi.hoisted(() => ({ pageFn: vi.fn<(input: unknown) => Promise<unknown>>() }))

vi.mock("~/src/modules/user/use-cases/get-admin-customers-page", () => ({
  getAdminCustomersPageQuery: (input: unknown) => ({
    queryFn: () => pageFn(input),
    queryKey: ["admin", "customers", "page", input],
  }),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-columns", () => ({
  useCustomerColumns: () => [
    { accessorKey: "name", header: "Customer", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.customer },
    { accessorKey: "role", header: "Role", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.role },
    { accessorKey: "banned", header: "Banned", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned },
    { accessorKey: "totalSpent", header: "Total spent", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent },
    { accessorKey: "id", header: "Record id", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId },
    { accessorKey: "stripeCustomerId", header: "Stripe id", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId },
  ],
}))

import {
  useCustomersDataGrid,
  useCustomersDataGridContext,
} from "~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-data-grid"
import { customersDataGrid } from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

import { customerRow } from "../../components/__test__/customers-grid-harness"

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const renderGrid = (onRowClick?: (customer: ReturnType<typeof customerRow>) => void) =>
  renderHook(() => useCustomersDataGrid({ onRowClick }), { wrapper: Wrapper })

const page = (items: ReturnType<typeof customerRow>[], total = items.length) => ({
  hasMore: false,
  items,
  limit: ADMIN_CUSTOMER_PAGE_SIZE,
  offset: 0,
  total,
})

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  pageFn.mockResolvedValue(page([customerRow(), customerRow({ id: "user-2", name: "Jan Nowak" })]))
})

describe("useCustomersDataGrid page request", () => {
  it("asks for the first page at the configured page size", async () => {
    renderGrid()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalled()
    })

    expect(pageFn).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: ADMIN_CUSTOMER_PAGE_SIZE }))
  })

  it("sends no search term and no stat filter while nothing is narrowed", async () => {
    renderGrid()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalled()
    })

    expect(pageFn).toHaveBeenCalledWith(expect.objectContaining({ search: undefined, statFilter: undefined }))
  })

  it("reports loading until the page arrives", async () => {
    const { result } = renderGrid()

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("feeds the fetched rows into the table, keyed by customer id", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getRowModel().rows).toHaveLength(2)
    })

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["user-1", "user-2"])
  })

  it("renders an empty table before any page has been fetched", () => {
    const { result } = renderGrid()

    expect(result.current.table.getRowModel().rows).toStrictEqual([])
    expect(result.current.table.getPageCount()).toBe(0)
  })

  it("derives the page count from the reported total", async () => {
    pageFn.mockResolvedValue(page([customerRow()], 60))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
  })
})

describe("useCustomersDataGrid context value", () => {
  it("keeps the shared persistence key so column preferences survive a reload", () => {
    const { result } = renderGrid()

    expect(result.current.persistenceKey).toBe(customersDataGrid.persistenceKey)
  })

  it("localizes the search placeholder", () => {
    const { result } = renderGrid()

    expect(result.current.searchPlaceholder).toBe("Search customers...")
  })

  it("offers no row reordering for customers", () => {
    const { result } = renderGrid()

    expect(result.current.rowReorder).toBeUndefined()
  })

  it("passes the row click handler straight through", () => {
    const onRowClick = vi.fn<(customer: ReturnType<typeof customerRow>) => void>()
    const { result } = renderGrid(onRowClick)

    expect(result.current.onRowClick).toBe(onRowClick)
  })

  it("hides the record and Stripe id columns by default and keeps the rest visible", () => {
    const { result } = renderGrid()

    expect(result.current.table.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId)?.getIsVisible()).toBe(false)
    expect(result.current.table.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId)?.getIsVisible()).toBe(false)
    expect(result.current.table.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.role)?.getIsVisible()).toBe(true)
  })

  it("pins the identity columns left and the money columns right", () => {
    const { result } = renderGrid()

    expect(result.current.table.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.customer)?.getIsPinned()).toBe("start")
    expect(result.current.table.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent)?.getIsPinned()).toBe("end")
  })
})

describe("useCustomersDataGrid filters", () => {
  it("starts with no stat filter applied", () => {
    const { result } = renderGrid()

    expect(result.current.activeStatFilter).toBeUndefined()
    expect(result.current.exportListInput.statFilter).toBeUndefined()
  })

  it("applies a stat filter to both the page request and the export input", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalled()
    })
    act(() => {
      result.current.applyCustomerStatFilter("returning")
    })

    expect(result.current.activeStatFilter).toBe("returning")
    expect(result.current.exportListInput.statFilter).toBe("returning")
    await waitFor(() => {
      expect(pageFn).toHaveBeenCalledWith(expect.objectContaining({ page: 1, statFilter: "returning" }))
    })
  })

  it("clears the stat filter again", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyCustomerStatFilter("returning")
    })
    act(() => {
      result.current.applyCustomerStatFilter()
    })

    expect(result.current.activeStatFilter).toBeUndefined()
    expect(result.current.exportListInput.statFilter).toBeUndefined()
  })

  it("returns to the first page when a stat filter is applied from a later page", async () => {
    pageFn.mockResolvedValue(page([customerRow()], 60))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
    act(() => {
      result.current.table.setPageIndex(1)
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(1)

    act(() => {
      result.current.applyCustomerStatFilter("returning")
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)
  })

  it("carries a column filter into both the page request and the export input", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalled()
    })
    act(() => {
      result.current.table.setColumnFilters([{ id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.role, value: ROLES.ADMIN }])
    })

    await waitFor(() => {
      expect(result.current.exportListInput.role).toBe(ROLES.ADMIN)
    })
    expect(pageFn).toHaveBeenCalledWith(expect.objectContaining({ role: ROLES.ADMIN }))
  })

  it("drops a column filter value the list filters do not understand", async () => {
    const { result } = renderGrid()

    act(() => {
      result.current.table.setColumnFilters([{ id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.role, value: "moderator" }])
    })

    await waitFor(() => {
      expect(result.current.exportListInput.role).toBeUndefined()
    })
  })

  it("returns to the first page whenever the column filters change", async () => {
    pageFn.mockResolvedValue(page([customerRow()], 60))
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
    act(() => {
      result.current.table.setPageIndex(2)
    })
    act(() => {
      result.current.table.setColumnFilters([{ id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned, value: true }])
    })

    await waitFor(() => {
      expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)
    })
    expect(result.current.exportListInput.banned).toBe(true)
  })

  it("keeps an empty export search undefined rather than an empty string", () => {
    const { result } = renderGrid()

    expect(result.current.exportListInput.search).toBeUndefined()
  })
})

describe("useCustomersDataGridContext", () => {
  it("refuses to run outside any data grid provider", () => {
    expect(() => renderHook(() => useCustomersDataGridContext(), { wrapper: Wrapper })).toThrow(
      "useDataGrid must be used within <DataGrid.Provider>",
    )
  })

  it("exposes the customers value when the provider carries one", async () => {
    const grid = renderGrid()

    await waitFor(() => {
      expect(grid.result.current.isLoading).toBe(false)
    })

    const value = grid.result.current
    const { result } = renderHook(() => useCustomersDataGridContext(), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <Wrapper>
          <customersDataGrid.Provider value={value}>{children}</customersDataGrid.Provider>
        </Wrapper>
      ),
    })

    expect(result.current.persistenceKey).toBe(customersDataGrid.persistenceKey)
  })
})

it("debounces and trims customer search for both the server page and export", async () => {
  pageFn.mockResolvedValue(page([customerRow()], 60))
  const { result } = renderGrid()
  await waitFor(() => {
    expect(result.current.table.getPageCount()).toBe(3)
  })
  act(() => {
    result.current.table.setPageIndex(2)
    result.current.table.setGlobalFilter("  anna  ")
  })

  expect(result.current.exportListInput.search).toBeUndefined()
  await waitFor(() => {
    expect(result.current.exportListInput.search).toBe("anna")
  })
  expect(pageFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: "anna" }))
  expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)

  act(() => {
    result.current.table.setGlobalFilter("   ")
  })
  await waitFor(() => {
    expect(result.current.exportListInput.search).toBeUndefined()
  })
  expect(pageFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: undefined }))
})

it("rejects a provider whose customer filtering API is not callable", () => {
  const grid = renderGrid()
  const value = { ...grid.result.current, applyCustomerStatFilter: undefined }
  const invalidWrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <Wrapper>
      <customersDataGrid.Provider value={value}>{children}</customersDataGrid.Provider>
    </Wrapper>
  )

  expect(() => renderHook(() => useCustomersDataGridContext(), { wrapper: invalidWrapper })).toThrow(
    "useCustomersDataGridContext must be used within the customers table Provider.",
  )
})
