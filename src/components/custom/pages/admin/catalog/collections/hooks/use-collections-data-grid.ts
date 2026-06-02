import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue, RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useCollectionColumns } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-columns";
import { useCollectionOrdering } from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collection-ordering";
import { useReorderCollections } from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-reorder-collections";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

import { COLLECTION_TABLE_COLUMN_PINNING } from "~/src/modules/collection/collection.constants";
import { collectionQueryOptions } from "~/src/modules/collection/collection.queries";
import type { Collection } from "~/src/modules/collection/collection.types";

const EMPTY_COLLECTIONS: Collection["adminListItem"][] = [];
const NONE = 0;

/**
 * Assembles the collections datagrid: it fetches the data, layers the optimistic
 * rank reordering on top of a full TanStack Table instance, and returns the
 * context value consumed by `collectionsDataGrid`.
 */
interface UseCollectionsDataGridOptions {
  readonly onRowClick?: (collection: Collection["adminListItem"]) => void;
}

export function useCollectionsDataGrid({ onRowClick }: UseCollectionsDataGridOptions): DataGridContextValue<Collection["adminListItem"]> {
  const t = useTranslations("admin");
  const { data: collections, isLoading, isRefetching } = useQuery(collectionQueryOptions.adminCollectionsQueryOptions());
  const resolvedCollections = collections ?? EMPTY_COLLECTIONS;
  const showSkeletonRows = isLoading || isRefetching;

  const reorder = useReorderCollections();
  const ordering = useCollectionOrdering(resolvedCollections, reorder);
  const columns = useCollectionColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: ordering.items,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: {
      left: [...COLLECTION_TABLE_COLUMN_PINNING.left],
      right: [...COLLECTION_TABLE_COLUMN_PINNING.right]
    },
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
      emptyMessage: t("collections.empty"),
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
