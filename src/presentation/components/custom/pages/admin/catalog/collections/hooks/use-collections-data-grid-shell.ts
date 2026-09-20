import { useMemo } from "react"

import { useTranslations } from "use-intl"

import { COLLECTION_TABLE_COLUMN_PINNING } from "~/src/modules/product-collection/product-collection.constants"
import { type Collection } from "~/src/modules/product-collection/product-collection.types"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useCollectionColumns } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-columns"
import { collectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"

export const useCollectionsDataGridShell = (): DataGridContextValue<Collection["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.collections")
  const columns = useCollectionColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: EMPTY_COLLECTIONS,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: COLLECTION_TABLE_COLUMN_PINNING,
    persistenceKey: collectionsDataGrid.persistenceKey,
  })
  return useMemo(
    () => ({
      columnReorder,
      hasPreferenceOverrides,
      isLoading: true,
      onRowClick: undefined,
      persistenceKey: collectionsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [columnReorder, hasPreferenceOverrides, resetPreferences, t, table],
  )
}
const EMPTY_COLLECTIONS: Collection["adminListItem"][] = []
