import { type RowData, type Table } from "@tanstack/react-table"

import { useDebounce } from "~/src/hooks/use-debounce"

import { ADMIN_SEARCH_DEBOUNCE_MS } from "~/src/lib/admin-search"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface AdminDebouncedTableSearchResult {
  readonly debouncedSearch: string
  readonly search: string
}

/** Debounces the datagrid global filter for server-side admin list queries. */
export const useAdminDebouncedTableSearch = <TData extends RowData>(
  table: Table<DataGridFeatures, TData>,
  delay = ADMIN_SEARCH_DEBOUNCE_MS,
): AdminDebouncedTableSearchResult => {
  const search = String(table.atoms.globalFilter.get() ?? "").trim()
  const debouncedSearch = useDebounce(search, delay).trim()

  return { debouncedSearch, search }
}
