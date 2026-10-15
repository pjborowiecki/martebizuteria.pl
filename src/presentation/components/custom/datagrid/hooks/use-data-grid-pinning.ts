import { useMemo, useSyncExternalStore } from "react"

import { type Column, type ColumnSizingState, type RowData } from "@tanstack/react-table"

import { type DataGridTableLayout } from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { resolveDataGridPinning } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

const subscribeToDesktopViewport = (onChange: () => void): (() => void) => {
  const query = globalThis.matchMedia(DATA_GRID_DESKTOP_MEDIA_QUERY)
  query.addEventListener("change", onChange)

  return () => {
    query.removeEventListener("change", onChange)
  }
}

const readDesktopViewport = (): boolean => globalThis.matchMedia(DATA_GRID_DESKTOP_MEDIA_QUERY).matches

const readDesktopViewportOnServer = (): boolean => true

export const useDataGridPinning = <TData extends RowData>({
  columnSizing,
  layoutColumns,
  tableClientWidth,
  tableLayout,
  tableWidth,
}: Readonly<{
  columnSizing: ColumnSizingState
  layoutColumns: readonly Column<DataGridFeatures, TData>[]
  tableClientWidth: number
  tableLayout: DataGridTableLayout | undefined
  tableWidth: number
}>): ReturnType<typeof resolveDataGridPinning> => {
  const isDesktopViewport = useSyncExternalStore(subscribeToDesktopViewport, readDesktopViewport, readDesktopViewportOnServer)

  return useMemo(
    () => resolveDataGridPinning({ columnSizing, isDesktopViewport, layoutColumns, tableClientWidth, tableLayout, tableWidth }),
    [columnSizing, isDesktopViewport, layoutColumns, tableClientWidth, tableLayout, tableWidth],
  )
}

const DATA_GRID_DESKTOP_MEDIA_QUERY = "(min-width: 64rem)"
