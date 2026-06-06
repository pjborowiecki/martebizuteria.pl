import { useEffect } from "react";

import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";

const TABLE_PAGE_INDEX_START = 0;

interface UseProductsServerListSyncOptions {
  readonly columnFilters: ColumnFiltersState;
  readonly debouncedSearch: string;
  readonly hasServerListQuery: boolean;
  readonly serverSorting: SortingState;
  readonly setPagination: (updater: PaginationState | ((previous: PaginationState) => PaginationState)) => void;
  readonly setServerSearch: (search: string) => void;
  readonly setServerSorting: (sorting: SortingState) => void;
}

export function useProductsServerListSync({
  columnFilters,
  debouncedSearch,
  hasServerListQuery,
  serverSorting,
  setPagination,
  setServerSearch,
  setServerSorting
}: UseProductsServerListSyncOptions): void {
  useEffect(() => {
    setServerSearch(debouncedSearch);
    if (debouncedSearch !== "") {
      setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
    }
  }, [debouncedSearch, setPagination, setServerSearch]);

  useEffect(() => {
    if (!hasServerListQuery) {
      setServerSorting([]);
    }
  }, [hasServerListQuery, setServerSorting]);

  useEffect(() => {
    if (hasServerListQuery) {
      setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
    }
  }, [columnFilters, hasServerListQuery, serverSorting, setPagination]);
}
