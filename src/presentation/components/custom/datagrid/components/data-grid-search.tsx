import { type ChangeEvent, type JSX, useCallback } from "react"

import { type RowData, type Table } from "@tanstack/react-table"
import { Search } from "lucide-react"

import { Input } from "~/src/presentation/components/shadcn/input"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface DataGridSearchProps<TData extends RowData> {
  readonly placeholder: string
  readonly table: Table<DataGridFeatures, TData>
}

/** Compact global-search input bound to the table's global filter. */
export const DataGridSearch = <TData extends RowData>({ placeholder, table }: DataGridSearchProps<TData>): JSX.Element => {
  const value = String(table.atoms.globalFilter.get() ?? "")

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      table.setGlobalFilter(event.target.value)
    },
    [table],
  )

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground/50"
        strokeWidth={1.5}
      />
      <Input
        type="search"
        value={value}
        onChange={handleChange}
        aria-label={placeholder}
        placeholder={placeholder}
        className="h-9 min-h-0 w-72 rounded-lg border border-input bg-background pr-3 pl-8 text-xs"
      />
    </div>
  )
}
