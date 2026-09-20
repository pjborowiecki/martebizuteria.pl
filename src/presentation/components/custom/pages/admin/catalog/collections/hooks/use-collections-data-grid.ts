import { useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl"

import {
  COLLECTION_STATUS,
  COLLECTION_STATUS_LABEL_KEYS,
  COLLECTION_TABLE_COLUMN_PINNING,
  COLLECTION_TABLE_DEFAULT_COLUMN_VISIBILITY,
} from "~/src/modules/product-collection/product-collection.constants"
import { type Collection } from "~/src/modules/product-collection/product-collection.types"
import { adminCollectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-admin-collections"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { createCatalogTableGlobalFilterFn } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import { type DataGridContextValue, type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useCollectionColumns } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-columns"
import { useCollectionOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collection-ordering"
import { useReorderCollections } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-reorder-collections"
import { collectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"
import { getCollectionAdminSearchParts } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-table-search"

export const useCollectionsDataGrid = ({
  onRowClick,
}: UseCollectionsDataGridOptions): DataGridContextValue<Collection["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.collections")
  const { data: collections, isFetching } = useSuspenseQuery(adminCollectionsQueryOptions())
  const showSkeletonRows = isFetching
  const reorder = useReorderCollections()
  const ordering = useCollectionOrdering(collections, reorder)
  const columns = useCollectionColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<Collection["adminListItem"]>((row) => {
        const statusLabel = t(
          row.status === COLLECTION_STATUS.ACTIVE ? COLLECTION_STATUS_LABEL_KEYS.active : COLLECTION_STATUS_LABEL_KEYS.draft,
        )
        return getCollectionAdminSearchParts(row, statusLabel)
      }),
    [t],
  )
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: ordering.items,
    defaultColumnVisibility: COLLECTION_TABLE_DEFAULT_COLUMN_VISIBILITY,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: COLLECTION_TABLE_COLUMN_PINNING,
    persistenceKey: collectionsDataGrid.persistenceKey,
  })

  // Reordering requires the natural rank order, without sorting or filtering.
  const columnFilters = table.atoms.columnFilters.get()
  const sorting = table.atoms.sorting.get()
  const search = String(table.atoms.globalFilter.get() ?? "").trim()
  const naturalOrder = sorting.length === 0 && columnFilters.length === 0 && search === ""
  const rowReorder = useMemo<RowReorderApi>(
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
  return useMemo(
    () => ({
      columnReorder,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      persistenceKey: collectionsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [columnReorder, hasPreferenceOverrides, onRowClick, resetPreferences, rowReorder, showSkeletonRows, t, table],
  )
}
interface UseCollectionsDataGridOptions {
  readonly onRowClick?: (collection: Collection["adminListItem"]) => void
}
