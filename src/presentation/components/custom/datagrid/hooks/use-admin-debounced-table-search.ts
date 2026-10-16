import { type RowData, type Table } from "@tanstack/react-table"

import { useDebounce } from "~/src/hooks/use-debounce"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { getDataGridSearch } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

const SEARCH_DEBOUNCE_MS = 300

interface AdminDebouncedTableSearchResult {
  readonly debouncedSearch: string
  readonly search: string
}

export const useAdminDebouncedTableSearch = <TData extends RowData>(
  table: Table<DataGridFeatures, TData>,
  delay = SEARCH_DEBOUNCE_MS,
): AdminDebouncedTableSearchResult => {
  const search = getDataGridSearch(table)
  const debouncedSearch = useDebounce(search, delay).trim()

  return { debouncedSearch, search }
}
