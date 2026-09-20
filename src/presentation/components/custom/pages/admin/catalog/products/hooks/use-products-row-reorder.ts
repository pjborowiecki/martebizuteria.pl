import { useMemo } from "react"

import { type ColumnFiltersState, type SortingState } from "@tanstack/react-table"

import { type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { type useProductOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-product-ordering"
export const useProductsRowReorder = ({
  columnFilters,
  hasServerListQuery,
  ordering,
  sorting,
}: UseProductsRowReorderOptions): RowReorderApi => {
  const naturalOrder = !hasServerListQuery && sorting.length === 0 && columnFilters.length === 0
  return useMemo(
    () => ({
      draggingId: ordering.draggingId,
      enabled: naturalOrder,
      onRowDragEnter: ordering.handleDragEnter,
      onRowDragStart: ordering.handleDragStart,
      onRowDrop: ordering.handleDrop,
      onRowMove: ordering.handleMove,
    }),
    [naturalOrder, ordering],
  )
}
interface UseProductsRowReorderOptions {
  readonly columnFilters: ColumnFiltersState
  readonly hasServerListQuery: boolean
  readonly ordering: ReturnType<typeof useProductOrdering>
  readonly sorting: SortingState
}
