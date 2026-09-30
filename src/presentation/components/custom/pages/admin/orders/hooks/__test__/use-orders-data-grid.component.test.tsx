import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDERS_PAGE_SIZE } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import {
  useOrdersDataGrid,
  useOrdersDataGridContext,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"
import { ORDERS_DATA_GRID_KEY } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

const { pageFn } = vi.hoisted(() => ({ pageFn: vi.fn<(input: unknown) => Promise<unknown>>() }))

vi.mock("~/src/modules/order/use-cases/get-admin-orders-page", () => ({
  getAdminOrdersPageQuery: (input: unknown) => ({
    queryFn: () => pageFn(input),
    queryKey: ["admin", "orders", "page", input],
  }),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-columns", () => ({
  useOrderColumns: () => [
    { accessorKey: "id", header: "Order", id: "orderId" },
    { accessorKey: "status", header: "Status", id: "status" },
  ],
}))

afterEach(cleanup)

const AT = new Date("2026-01-01T00:00:00.000Z")

const orderRow = (id: string): Order["adminListItem"] => ({
  createdAt: AT,
  currencyCode: "PLN",
  customerName: "Ada Nowak",
  email: "ada@example.test",
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: "unfulfilled",
  id,
  initials: "AN",
  itemCount: 1,
  paymentUiKey: "paid",
  status: "processing",
  totalMinorUnits: 12_000,
  userId: null,
})

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const renderGrid = () => renderHook(() => useOrdersDataGrid({}), { wrapper: Wrapper })

describe("useOrdersDataGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pageFn.mockResolvedValue({ hasMore: false, items: [orderRow("order-1"), orderRow("order-2")], limit: 25, offset: 0, total: 2 })
  })

  it("asks for the first page at the configured page size", async () => {
    renderGrid()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalled()
    })

    expect(pageFn).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: ADMIN_ORDERS_PAGE_SIZE }))
  })

  it("sends no search term while the box is empty", async () => {
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

  it("feeds the fetched rows into the table, keyed by order id", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getRowModel().rows).toHaveLength(2)
    })

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["order-1", "order-2"])
  })

  it("keeps the shared persistence key so column preferences survive a reload", () => {
    const { result } = renderGrid()

    expect(result.current.persistenceKey).toBe(ORDERS_DATA_GRID_KEY)
  })

  it("localizes the search placeholder", () => {
    const { result } = renderGrid()

    expect(result.current.searchPlaceholder).toBe("Search orders…")
  })

  it("offers no row reordering for orders", () => {
    const { result } = renderGrid()

    expect(result.current.rowReorder).toBeUndefined()
  })

  it("reports an empty table when the server returns nothing", async () => {
    pageFn.mockResolvedValue({ hasMore: false, items: [], limit: 25, offset: 0, total: 0 })
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.table.getRowModel().rows).toStrictEqual([])
    expect(result.current.table.getPageCount()).toBe(0)
  })
})

describe("useOrdersDataGrid filters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pageFn.mockResolvedValue({ hasMore: false, items: [orderRow("order-1"), orderRow("order-2")], limit: 25, offset: 0, total: 2 })
  })

  it("starts with no stat filter applied", () => {
    const { result } = renderGrid()

    expect(result.current.activeStatFilter).toBeUndefined()
  })

  it("applies a stat filter to both the page request and the export input", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalled()
    })
    act(() => {
      result.current.applyOrderStatFilter("pending")
    })

    expect(result.current.activeStatFilter).toBe("pending")
    expect(result.current.exportListInput.statFilter).toBe("pending")
    await waitFor(() => {
      expect(pageFn).toHaveBeenCalledWith(expect.objectContaining({ page: 1, statFilter: "pending" }))
    })
  })

  it("clears the stat filter again", () => {
    const { result } = renderGrid()

    act(() => {
      result.current.applyOrderStatFilter("pending")
    })
    act(() => {
      result.current.applyOrderStatFilter()
    })

    expect(result.current.activeStatFilter).toBeUndefined()
    expect(result.current.exportListInput.statFilter).toBeUndefined()
  })

  it("returns to the first page when a stat filter is applied from a later page", async () => {
    pageFn.mockResolvedValue({ hasMore: true, items: [orderRow("order-1")], limit: 25, offset: 0, total: 60 })
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
    act(() => {
      result.current.table.setPageIndex(1)
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(1)

    act(() => {
      result.current.applyOrderStatFilter("pending")
    })

    expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)
  })

  it("carries the column filters into the export input", async () => {
    const { result } = renderGrid()

    await waitFor(() => {
      expect(pageFn).toHaveBeenCalled()
    })
    act(() => {
      result.current.table.setColumnFilters([{ id: "status", value: "processing" }])
    })

    await waitFor(() => {
      expect(result.current.exportListInput.status).toBe("processing")
    })
  })

  it("keeps an empty export search undefined rather than an empty string", () => {
    const { result } = renderGrid()

    expect(result.current.exportListInput.search).toBeUndefined()
  })

  it("derives the page count from the reported total", async () => {
    pageFn.mockResolvedValue({ hasMore: true, items: [orderRow("order-1")], limit: 25, offset: 0, total: 60 })
    const { result } = renderGrid()

    await waitFor(() => {
      expect(result.current.table.getPageCount()).toBe(3)
    })
  })
})

describe("useOrdersDataGridContext", () => {
  it("refuses to run outside the orders table provider", () => {
    expect(() => renderHook(() => useOrdersDataGridContext(), { wrapper: Wrapper })).toThrow(
      "useDataGrid must be used within <DataGrid.Provider>",
    )
  })
})

it("debounces order search and resets pagination for matching exports and server results", async () => {
  pageFn.mockResolvedValue({ hasMore: true, items: [orderRow("order-1")], limit: 25, offset: 0, total: 60 })
  const { result } = renderGrid()
  await waitFor(() => {
    expect(result.current.table.getPageCount()).toBe(3)
  })
  act(() => {
    result.current.table.setPageIndex(2)
    result.current.table.setGlobalFilter("  ada  ")
  })

  expect(result.current.exportListInput.search).toBeUndefined()
  await waitFor(() => {
    expect(result.current.exportListInput.search).toBe("ada")
  })
  expect(pageFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: "ada" }))
  expect(result.current.table.atoms.pagination.get().pageIndex).toBe(0)
})
