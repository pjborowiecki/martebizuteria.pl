import { type FilterFn, type Row, type RowData } from "@tanstack/react-table"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

type CatalogTableSearchPart = string | number | null | undefined

const normalizeSearchQuery = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim().toLowerCase()
  }

  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value).trim().toLowerCase()
  }

  return ""
}

const appendSearchPart = (parts: string[], value: CatalogTableSearchPart): void => {
  if (value === null || value === undefined || value === "") {
    return
  }

  parts.push(String(value))
}

export const rowMatchesCatalogTableSearch = (parts: CatalogTableSearchPart[], filterValue: unknown): boolean => {
  const query = normalizeSearchQuery(filterValue)
  if (query === "") {
    return true
  }

  const haystack = parts.map((part) => String(part).toLowerCase()).join(" ")

  return haystack.includes(query)
}

export const createCatalogTableGlobalFilterFn =
  <TData extends RowData>(getSearchableParts: (row: TData) => CatalogTableSearchPart[]): FilterFn<DataGridFeatures, TData> =>
  (row: Row<DataGridFeatures, TData>, _columnId: string, filterValue: unknown) =>
    rowMatchesCatalogTableSearch(getSearchableParts(row.original), filterValue)

export { appendSearchPart }
