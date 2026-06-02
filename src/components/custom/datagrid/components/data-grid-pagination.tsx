import { type JSX, useCallback, useMemo } from "react";

import type { RowData, Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

const FIRST_PAGE = 0;
const PAGE_OFFSET = 1;
const NO_ROWS = 0;
const PAGE_SIZE_SM = 10;
const PAGE_SIZE_MD = 20;
const PAGE_SIZE_LG = 30;
const PAGE_SIZE_XL = 50;
const PAGE_SIZE_OPTIONS = [PAGE_SIZE_SM, PAGE_SIZE_MD, PAGE_SIZE_LG, PAGE_SIZE_XL] as const;

interface DataGridPaginationProps<TData extends RowData> {
  readonly table: Table<TData>;
}

/** Bottom bar: rows-per-page selector, current range, and page navigation. */
export function DataGridPagination<TData extends RowData>({ table }: DataGridPaginationProps<TData>): JSX.Element {
  const t = useTranslations("dataGrid");
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(table.getPageCount(), PAGE_OFFSET);
  const from = totalRows === NO_ROWS ? NO_ROWS : pageIndex * pageSize + PAGE_OFFSET;
  const to = Math.min((pageIndex + PAGE_OFFSET) * pageSize, totalRows);

  const sizeOptions = useMemo(() => PAGE_SIZE_OPTIONS.map((size) => ({ label: String(size), value: String(size) })), []);

  const handlePageSizeChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        table.setPageSize(Number(value));
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
    <div className="flex flex-col gap-3 border-t border-border/60 bg-transparent px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">{t("pagination.rowsPerPage")}</span>
          <Select items={sizeOptions} value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger size="sm" className="w-16">
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
