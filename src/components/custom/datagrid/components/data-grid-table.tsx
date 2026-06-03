import { type JSX, useMemo, useRef } from "react";

import type { RowData, Table } from "@tanstack/react-table";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { DataTable, DataTableContainer, dataTableContentStyle } from "~/src/components/shadcn/data-table";
import { TableBody, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { DataGridHeaderCell } from "~/src/components/custom/datagrid/components/data-grid-header-cell";
import { DataGridLayoutProvider } from "~/src/components/custom/datagrid/components/data-grid-layout-context";
import { DataGridTableBody } from "~/src/components/custom/datagrid/components/data-grid-table-body";
import { useDataGridLayoutColumns } from "~/src/components/custom/datagrid/hooks/use-data-grid-layout-columns";
import { useDatagridContainerWidth } from "~/src/components/custom/datagrid/hooks/use-datagrid-table-layout";
import { buildDataGridColumnWidthStyle } from "~/src/components/custom/datagrid/lib/data-grid-column-width";
import { DATA_GRID_HEADER_ROW_CLASS } from "~/src/components/custom/datagrid/lib/data-grid-header.styles";
import {
  getDataGridColumnLayoutWidth,
  getDataGridContentWidth,
  getDataGridTableMinWidth,
  resolveDataGridTableLayout
} from "~/src/components/custom/datagrid/lib/data-grid-table-layout";
import type { ColumnReorderApi, RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridLayoutHeaders, getDataGridRightPinnedScrollPaddingPx } from "~/src/components/custom/datagrid/lib/data-grid.utils";

const MAX_SKELETON_ROWS = 5;
const UNMEASURED_CONTAINER_WIDTH = 0;
const ZERO = 0;
interface DataGridTableProps<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi;
  readonly isLoading: boolean;
  readonly onRowClick?: (row: TData) => void;
  readonly persistenceKey: string;
  readonly rowReorder: RowReorderApi | undefined;
  readonly table: Table<TData>;
}

export function DataGridTable<TData extends RowData>({
  columnReorder,
  isLoading,
  onRowClick,
  persistenceKey,
  rowReorder,
  table
}: DataGridTableProps<TData>): JSX.Element {
  const t = useTranslations("common");
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();
  const { columnSizing, pagination } = table.getState();
  const layoutColumns = useDataGridLayoutColumns(table);
  const layoutHeaders = getDataGridLayoutHeaders(table);
  const visibleColumnCount = layoutColumns.length;

  const tableMinWidth = useMemo(() => getDataGridTableMinWidth(layoutColumns, columnSizing), [columnSizing, layoutColumns]);
  const layoutKey = tableMinWidth + visibleColumnCount;
  const tableClientWidth = useDatagridContainerWidth(containerRef, layoutKey);

  const hasMeasuredContainer = tableClientWidth > UNMEASURED_CONTAINER_WIDTH;

  const tableLayout = useMemo(
    () => (hasMeasuredContainer ? resolveDataGridTableLayout({ columnSizing, columns: layoutColumns, tableClientWidth }) : undefined),
    [columnSizing, hasMeasuredContainer, layoutColumns, tableClientWidth]
  );

  const tableWidth = useMemo(
    () => getDataGridContentWidth({ columnSizing, columns: layoutColumns, tableClientWidth }),
    [columnSizing, layoutColumns, tableClientWidth]
  );

  const tableStyle = useMemo(
    () => dataTableContentStyle({ containerWidthPx: tableClientWidth, layoutWidthPx: tableWidth, minWidthPx: tableMinWidth }),
    [tableClientWidth, tableMinWidth, tableWidth]
  );
  const resolvedTableWidth = Math.max(tableMinWidth, tableWidth);
  const rightPinnedScrollPaddingPx = useMemo(
    () => getDataGridRightPinnedScrollPaddingPx(layoutColumns, columnSizing, tableLayout),
    [columnSizing, layoutColumns, tableLayout]
  );

  const containerStyle = useMemo(
    () => (rightPinnedScrollPaddingPx > ZERO ? { scrollPaddingInlineEnd: rightPinnedScrollPaddingPx } : undefined),
    [rightPinnedScrollPaddingPx]
  );

  const layoutValue = useMemo(
    () => ({ tableClientWidth, tableLayout, tableWidth: resolvedTableWidth }),
    [resolvedTableWidth, tableClientWidth, tableLayout]
  );

  const skeletonRowCount = Math.min(pagination.pageSize, MAX_SKELETON_ROWS);

  return (
    <DataGridLayoutProvider value={layoutValue}>
      <DataTableContainer ref={containerRef} style={containerStyle}>
        <DataTable className="w-full" style={tableStyle}>
          <colgroup>
            {layoutColumns.map((column) => (
              <col
                key={column.id}
                style={buildDataGridColumnWidthStyle({
                  column,
                  layout: tableLayout,
                  persistenceKey,
                  widthPx: getDataGridColumnLayoutWidth(column, columnSizing, tableLayout)
                })}
              />
            ))}
          </colgroup>
          <TableHeader className="bg-muted [&_tr]:border-border/60">
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
              onRowClick={onRowClick}
              persistenceKey={persistenceKey}
              rowReorder={rowReorder}
              rows={rows}
              skeletonRowCount={skeletonRowCount}
              table={table}
              visibleColumnCount={visibleColumnCount}
            />
          </TableBody>
        </DataTable>
      </DataTableContainer>
    </DataGridLayoutProvider>
  );
}
