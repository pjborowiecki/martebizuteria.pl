import { useEffect } from "react"

import { type ColumnFiltersState, type PaginationState, type SortingState } from "@tanstack/react-table"
export const useProductsServerListSync = ({
  columnFilters,
  debouncedSearch,
  hasServerListQuery,
  serverSorting,
  setPagination,
  setServerSearch,
  setServerSorting,
}: UseProductsServerListSyncOptions): void => {
  useEffect(() => {
    setServerSearch(debouncedSearch)
    if (debouncedSearch !== "") {
      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }))
    }
  }, [debouncedSearch, setPagination, setServerSearch])
  useEffect(() => {
    if (!hasServerListQuery) {
      setServerSorting([])
    }
  }, [hasServerListQuery, setServerSorting])
  useEffect(() => {
    if (hasServerListQuery) {
      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }))
    }
  }, [columnFilters, hasServerListQuery, serverSorting, setPagination])
}
interface UseProductsServerListSyncOptions {
  readonly columnFilters: ColumnFiltersState
  readonly debouncedSearch: string
  readonly hasServerListQuery: boolean
  readonly serverSorting: SortingState
  readonly setPagination: (updater: PaginationState | ((previous: PaginationState) => PaginationState)) => void
  readonly setServerSearch: (search: string) => void
  readonly setServerSorting: (sorting: SortingState) => void
}
