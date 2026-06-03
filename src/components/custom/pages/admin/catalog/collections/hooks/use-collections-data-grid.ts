import { useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import { createCatalogTableGlobalFilterFn } from "~/src/components/custom/datagrid/lib/catalog-table-global-filter";
import type { DataGridContextValue, RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useCollectionColumns } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-columns";
import { useCollectionOrdering } from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collection-ordering";
import { useReorderCollections } from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-reorder-collections";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";
import { getCollectionAdminSearchParts } from "~/src/components/custom/pages/admin/catalog/lib/catalog-admin-table-search";

import {
  COLLECTION_STATUS,
  COLLECTION_STATUS_LABEL_KEYS,
  COLLECTION_TABLE_COLUMN_PINNING,
  COLLECTION_TABLE_DEFAULT_COLUMN_VISIBILITY
} from "~/src/modules/collection/collection.constants";
import { collectionQueryOptions } from "~/src/modules/collection/collection.queries";
import type { Collection } from "~/src/modules/collection/collection.types";

const NONE = 0;

/**
 * Assembles the collections datagrid. List data is loaded via `useSuspenseQuery`
 * (prefetched in the route loader); `isFetching` drives skeleton rows on refresh.
 */
interface UseCollectionsDataGridOptions {
  readonly onRowClick?: (collection: Collection["adminListItem"]) => void;
}

export function useCollectionsDataGrid({ onRowClick }: UseCollectionsDataGridOptions): DataGridContextValue<Collection["adminListItem"]> {
  const t = useTranslations("admin");
  const { data: collections, isFetching } = useSuspenseQuery(collectionQueryOptions.adminCollectionsQueryOptions());
  const showSkeletonRows = isFetching;

  const reorder = useReorderCollections();
  const ordering = useCollectionOrdering(collections, reorder);
  const columns = useCollectionColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<Collection["adminListItem"]>((row) => {
        const statusLabel = t(
          row.status === COLLECTION_STATUS.ACTIVE ? COLLECTION_STATUS_LABEL_KEYS.active : COLLECTION_STATUS_LABEL_KEYS.draft
        );
        return getCollectionAdminSearchParts(row, statusLabel);
      }),
    [t]
  );

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: ordering.items,
    defaultColumnVisibility: COLLECTION_TABLE_DEFAULT_COLUMN_VISIBILITY,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: COLLECTION_TABLE_COLUMN_PINNING,
    persistenceKey: collectionsDataGrid.persistenceKey
  });

  // Manual row reordering only makes sense in the natural rank order: any active
  // sort, search or column filter rearranges rows and disables drag-reorder.
  const { columnFilters, sorting } = table.getState();
  const search = String(table.getState().globalFilter ?? "").trim();
  const naturalOrder = sorting.length === NONE && columnFilters.length === NONE && search === "";

  const rowReorder = useMemo<RowReorderApi>(
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

  return useMemo(
    () => ({
      columnReorder,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      persistenceKey: collectionsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("collections.searchPlaceholder"),
      table
    }),
    [columnReorder, hasPreferenceOverrides, onRowClick, resetPreferences, rowReorder, showSkeletonRows, t, table]
  );
}
