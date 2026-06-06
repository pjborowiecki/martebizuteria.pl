import { useMemo } from "react";

import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

import type { RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import type { useProductOrdering } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-product-ordering";

const NONE = 0;

interface UseProductsRowReorderOptions {
  readonly columnFilters: ColumnFiltersState;
  readonly hasServerListQuery: boolean;
  readonly ordering: ReturnType<typeof useProductOrdering>;
  readonly sorting: SortingState;
}

export function useProductsRowReorder({
  columnFilters,
  hasServerListQuery,
  ordering,
  sorting
}: UseProductsRowReorderOptions): RowReorderApi {
  const naturalOrder = !hasServerListQuery && sorting.length === NONE && columnFilters.length === NONE;

  return useMemo(
    () => ({
      draggingId: ordering.draggingId,
      enabled: naturalOrder,
      onRowDragEnter: ordering.handleDragEnter,
      onRowDragStart: ordering.handleDragStart,
      onRowDrop: ordering.handleDrop,
      onRowMove: ordering.handleMove
    }),
    [naturalOrder, ordering]
  );
}
