import { type JSX, useCallback, useEffect, useMemo } from "react";

import type { RowData, Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import {
  DATA_GRID_PAGE_SIZE_OPTIONS,
  isDataGridPageSize,
  normalizeDataGridPageSize
} from "~/src/components/custom/datagrid/lib/data-grid-pagination.constants";

const FIRST_PAGE = 0;
const PAGE_OFFSET = 1;
const NO_ROWS = 0;

interface DataGridPaginationProps<TData extends RowData> {
  readonly table: Table<TData>;
}

/** Bottom bar: rows-per-page selector, current range, and page navigation. */
export function DataGridPagination<TData extends RowData>({ table }: DataGridPaginationProps<TData>): JSX.Element {
  const t = useTranslations("components.datagrid");
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.options.manualPagination === true ? (table.options.rowCount ?? NO_ROWS) : table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(table.getPageCount(), PAGE_OFFSET);
  const from = totalRows === NO_ROWS ? NO_ROWS : pageIndex * pageSize + PAGE_OFFSET;
  const to = Math.min((pageIndex + PAGE_OFFSET) * pageSize, totalRows);

  const sizeOptions = useMemo(() => DATA_GRID_PAGE_SIZE_OPTIONS.map((size) => ({ label: String(size), value: String(size) })), []);

  useEffect(() => {
    if (!isDataGridPageSize(pageSize)) {
      table.setPageSize(normalizeDataGridPageSize(pageSize));
    }
  }, [pageSize, table]);

  const handlePageSizeChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        const nextPageSize = Number(value);
        if (isDataGridPageSize(nextPageSize)) {
          table.setPageSize(nextPageSize);
        }
      }
    },
    [table]
  );

  const handleFirst = useCallback(() => {
    table.setPageIndex(FIRST_PAGE);
  }, [table]);
  const handlePrevious = useCallback(() => {
    table.previousPage();
  }, [table]);
  const handleNext = useCallback(() => {
    table.nextPage();
  }, [table]);
  const handleLast = useCallback(() => {
    table.setPageIndex(pageCount - PAGE_OFFSET);
  }, [table, pageCount]);

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-border/60 bg-transparent px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">{t("pagination.rowsPerPage")}</span>
          <Select items={sizeOptions} value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger size="sm" className="w-[4.25rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="whitespace-nowrap tabular-nums">
          {t("pagination.showing", { count: String(totalRows), from: String(from), to: String(to) })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {t("pagination.page", { page: String(pageIndex + PAGE_OFFSET), total: String(pageCount) })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleFirst}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("pagination.first")}
          >
            <ChevronsLeft className="size-4" strokeWidth={1.5} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handlePrevious}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("pagination.previous")}
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleNext}
            disabled={!table.getCanNextPage()}
            aria-label={t("pagination.next")}
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleLast}
            disabled={!table.getCanNextPage()}
            aria-label={t("pagination.last")}
          >
            <ChevronsRight className="size-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}
