import { type JSX, useMemo, useRef } from "react"

import { type RowData, type Table } from "@tanstack/react-table"
import { cn } from "cn"
import { useTranslations } from "use-intl"

import { DataTable, DataTableContainer, dataTableContentStyle } from "~/src/presentation/components/shadcn/data-table"
import { TableBody, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { DataGridHeaderCell } from "~/src/presentation/components/custom/datagrid/components/data-grid-header-cell"
import { DataGridLayoutProvider } from "~/src/presentation/components/custom/datagrid/components/data-grid-layout-context"
import { DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT } from "~/src/presentation/components/custom/datagrid/components/data-grid-row"
import { DATA_GRID_BODY_SCROLL_CLASS } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { DataGridTableBody } from "~/src/presentation/components/custom/datagrid/components/data-grid-table-body"
import { useDatagridContainerWidth } from "~/src/presentation/components/custom/datagrid/hooks/use-datagrid-table-layout"
import { buildDataGridColumnWidthStyle } from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-width"
import { DATA_GRID_HEADER_ROW_CLASS } from "~/src/presentation/components/custom/datagrid/lib/data-grid-header.styles"
import {
  getDataGridColumnLayoutWidth,
  getDataGridContentWidth,
  getDataGridTableMinWidth,
  resolveDataGridTableLayout,
  sumDataGridLayoutColumnWidths,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type ColumnReorderApi, type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import {
  getDataGridLayoutColumns,
  getDataGridLayoutHeaders,
  getDataGridRightPinnedScrollPaddingPx,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

const getDataGridPlaceholderBodyState = (rowCount: number): { isPlaceholderBody: boolean; skeletonRowCount: number } => {
  const isPlaceholderBody = rowCount === 0
  return {
    isPlaceholderBody,
    skeletonRowCount: isPlaceholderBody ? DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT : rowCount,
  }
}

interface DataGridTableProps<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi
  readonly isLoading: boolean
  readonly onRowClick?: ((row: TData) => void) | undefined
  readonly onRowPointerEnter?: ((row: TData) => void) | undefined
  readonly persistenceKey: string
  readonly rowReorder: RowReorderApi | undefined
  readonly table: Table<DataGridFeatures, TData>
}

export const DataGridTable = <TData extends RowData>({
  columnReorder,
  isLoading,
  onRowClick,
  onRowPointerEnter,
  persistenceKey,
  rowReorder,
  table,
}: DataGridTableProps<TData>): JSX.Element => {
  const t = useTranslations("common")
  const containerRef = useRef<HTMLDivElement>(null)
  const { rows } = table.getRowModel()
  const columnSizing = table.atoms.columnSizing.get()
  const layoutColumns = getDataGridLayoutColumns(table)
  const layoutHeaders = getDataGridLayoutHeaders(table)

  const tableMinWidth = useMemo(() => getDataGridTableMinWidth(layoutColumns, columnSizing), [columnSizing, layoutColumns])
  const layoutKey = tableMinWidth + layoutColumns.length
  const tableClientWidth = useDatagridContainerWidth(containerRef, layoutKey)

  const hasMeasuredContainer = tableClientWidth > 0

  const tableLayout = useMemo(
    () => (hasMeasuredContainer ? resolveDataGridTableLayout({ columnSizing, columns: layoutColumns, tableClientWidth }) : undefined),
    [columnSizing, hasMeasuredContainer, layoutColumns, tableClientWidth],
  )

  const tableWidth = useMemo(
    () => getDataGridContentWidth({ columnSizing, columns: layoutColumns, tableClientWidth }),
    [columnSizing, layoutColumns, tableClientWidth],
  )

  const layoutColumnWidthsSum = useMemo(
    () => (tableLayout === undefined ? undefined : sumDataGridLayoutColumnWidths(layoutColumns, columnSizing, tableLayout)),
    [columnSizing, layoutColumns, tableLayout],
  )

  const resolvedTableWidth = useMemo(() => {
    if (layoutColumnWidthsSum !== undefined) {
      const measuredFloor = hasMeasuredContainer ? tableClientWidth : 0
      return Math.max(tableMinWidth, layoutColumnWidthsSum, measuredFloor)
    }

    return Math.max(tableMinWidth, tableWidth)
  }, [hasMeasuredContainer, layoutColumnWidthsSum, tableClientWidth, tableMinWidth, tableWidth])

  const tableStyle = useMemo(
    () => dataTableContentStyle({ containerWidthPx: tableClientWidth, layoutWidthPx: resolvedTableWidth, minWidthPx: tableMinWidth }),
    [resolvedTableWidth, tableClientWidth, tableMinWidth],
  )
  const rightPinnedScrollPaddingPx = useMemo(
    () => getDataGridRightPinnedScrollPaddingPx(layoutColumns, columnSizing, tableLayout),
    [columnSizing, layoutColumns, tableLayout],
  )

  const containerStyle = useMemo(
    () => (rightPinnedScrollPaddingPx > 0 ? { scrollPaddingInlineEnd: rightPinnedScrollPaddingPx } : undefined),
    [rightPinnedScrollPaddingPx],
  )

  const layoutValue = useMemo(
    () => ({ tableClientWidth, tableLayout, tableWidth: resolvedTableWidth }),
    [resolvedTableWidth, tableClientWidth, tableLayout],
  )

  const { isPlaceholderBody, skeletonRowCount } = getDataGridPlaceholderBodyState(rows.length)

  return (
    <DataGridLayoutProvider value={layoutValue}>
      <DataTableContainer ref={containerRef} className={DATA_GRID_BODY_SCROLL_CLASS} style={containerStyle}>
        <DataTable className="w-full" style={tableStyle}>
          <colgroup>
            {layoutColumns.map((column) => (
              <col
                key={column.id}
                style={buildDataGridColumnWidthStyle({
                  column,
                  layout: tableLayout,
                  persistenceKey,
                  widthPx: getDataGridColumnLayoutWidth(column, columnSizing, tableLayout),
                })}
              />
            ))}
          </colgroup>
          <TableHeader className="[&_tr]:border-border/60">
            <TableRow className={cn(DATA_GRID_HEADER_ROW_CLASS, String.raw`[&>th:last-child>button.group\/resize]:hidden`)}>
              {layoutHeaders.map((header) => (
                <DataGridHeaderCell key={header.id} header={header} columnReorder={columnReorder} persistenceKey={persistenceKey} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child>td]:border-b-0">
            <DataGridTableBody
              columns={layoutColumns}
              emptyMessage={t("noDataToDisplay")}
              isLoading={isLoading}
              isPlaceholderBody={isPlaceholderBody}
              onRowClick={onRowClick}
              onRowPointerEnter={onRowPointerEnter}
              persistenceKey={persistenceKey}
              rowReorder={rowReorder}
              rows={rows}
              skeletonRowCount={skeletonRowCount}
              table={table}
              visibleColumnCount={layoutColumns.length}
            />
          </TableBody>
        </DataTable>
      </DataTableContainer>
    </DataGridLayoutProvider>
  )
}
