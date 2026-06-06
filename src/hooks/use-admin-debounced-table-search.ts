import type { RowData, Table } from "@tanstack/react-table";

import { ADMIN_SEARCH_DEBOUNCE_MS } from "~/src/lib/_utils/admin-search";

import { useDebounce } from "~/src/hooks/use-debounce";

interface AdminDebouncedTableSearchResult {
  readonly debouncedSearch: string;
  readonly search: string;
}

/** Debounces the datagrid global filter for server-side admin list queries. */
export function useAdminDebouncedTableSearch<TData extends RowData>(
  table: Table<TData>,
  delay = ADMIN_SEARCH_DEBOUNCE_MS
): AdminDebouncedTableSearchResult {
  const search = String(table.getState().globalFilter ?? "").trim();
  const debouncedSearch = useDebounce(search, delay).trim();

  return { debouncedSearch, search };
}
