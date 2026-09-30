import { type ColumnFiltersState, type PaginationState, type SortingState } from "@tanstack/react-table"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { useProductsServerListSync } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-server-list-sync"

interface SyncOptions {
  readonly columnFilters: ColumnFiltersState
  readonly debouncedSearch: string
  readonly hasServerListQuery: boolean
  readonly serverSorting: SortingState
}

const renderSync = (options: SyncOptions) => {
  const spies = {
    setPagination: vi.fn<(updater: PaginationState | ((previous: PaginationState) => PaginationState)) => void>(),
    setServerSearch: vi.fn<(search: string) => void>(),
    setServerSorting: vi.fn<(sorting: SortingState) => void>(),
  }

  const view = renderHook((next: SyncOptions = options) => {
    useProductsServerListSync({ ...next, ...spies })
  })

  return { ...view, spies }
}

const applyPaginationUpdate = (
  updater: PaginationState | ((previous: PaginationState) => PaginationState),
  previous: PaginationState,
): PaginationState => (typeof updater === "function" ? updater(previous) : updater)

afterEach(() => {
  cleanup()
})

describe("useProductsServerListSync", () => {
  it("publishes the debounced search term to the server query", () => {
    const { spies } = renderSync({ columnFilters: [], debouncedSearch: "ring", hasServerListQuery: true, serverSorting: [] })

    expect(spies.setServerSearch).toHaveBeenCalledWith("ring")
  })

  it("resets to the first page when a search term is present", () => {
    const { spies } = renderSync({ columnFilters: [], debouncedSearch: "ring", hasServerListQuery: true, serverSorting: [] })
    const [firstCall] = spies.setPagination.mock.calls

    expect(firstCall).toBeDefined()
    expect(applyPaginationUpdate(firstCall?.[0] ?? { pageIndex: 3, pageSize: 10 }, { pageIndex: 3, pageSize: 10 })).toStrictEqual({
      pageIndex: 0,
      pageSize: 10,
    })
  })

  it("does not reset the page for an empty search on a client side list", () => {
    const { spies } = renderSync({ columnFilters: [], debouncedSearch: "", hasServerListQuery: false, serverSorting: [] })

    expect(spies.setServerSearch).toHaveBeenCalledWith("")
    expect(spies.setPagination).not.toHaveBeenCalled()
  })

  it("clears the server sorting once the list is served from the client", () => {
    const { spies } = renderSync({
      columnFilters: [],
      debouncedSearch: "",
      hasServerListQuery: false,
      serverSorting: [{ desc: true, id: "title" }],
    })

    expect(spies.setServerSorting).toHaveBeenCalledWith([])
  })

  it("keeps the server sorting while the server serves the list", () => {
    const { spies } = renderSync({
      columnFilters: [],
      debouncedSearch: "",
      hasServerListQuery: true,
      serverSorting: [{ desc: true, id: "title" }],
    })

    expect(spies.setServerSorting).not.toHaveBeenCalled()
    expect(spies.setPagination).toHaveBeenCalledTimes(1)
  })

  it("returns to the first page when the server filters change", () => {
    const { rerender, spies } = renderSync({ columnFilters: [], debouncedSearch: "", hasServerListQuery: true, serverSorting: [] })

    expect(spies.setPagination).toHaveBeenCalledTimes(1)

    rerender({
      columnFilters: [{ id: "status", value: "draft" }],
      debouncedSearch: "",
      hasServerListQuery: true,
      serverSorting: [],
    })

    expect(spies.setPagination).toHaveBeenCalledTimes(2)
  })
})
