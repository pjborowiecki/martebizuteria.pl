import { useMemo } from "react";

import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useCollectionColumns } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-columns";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

import { COLLECTION_TABLE_COLUMN_PINNING } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";

const EMPTY_COLLECTIONS: Collection["adminListItem"][] = [];

/** Empty grid used only for layout-matched skeletons (header, toolbar, row placeholders). */
export function useCollectionsDataGridShell(): DataGridContextValue<Collection["adminListItem"]> {
  const t = useTranslations("admin");
  const columns = useCollectionColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: EMPTY_COLLECTIONS,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: {
      left: [...COLLECTION_TABLE_COLUMN_PINNING.left],
      right: [...COLLECTION_TABLE_COLUMN_PINNING.right]
    },
    persistenceKey: collectionsDataGrid.persistenceKey
  });

  return useMemo(
    () => ({
      columnReorder,
      emptyMessage: t("collections.empty"),
      hasPreferenceOverrides,
      isLoading: true,
      onRowClick: undefined,
      persistenceKey: collectionsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("collections.searchPlaceholder"),
      table
    }),
    [columnReorder, hasPreferenceOverrides, resetPreferences, t, table]
  );
}
