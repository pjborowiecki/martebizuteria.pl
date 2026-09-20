import { useMemo } from "react"

import { useTranslations } from "use-intl"

import { CATEGORY_TABLE_COLUMN_PINNING } from "~/src/modules/product-category/product-category.constants"
import { type Category } from "~/src/modules/product-category/product-category.types"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useCategoryColumns } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-columns"
import { categoriesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid"

export const useCategoriesDataGridShell = (): DataGridContextValue<Category["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.categories")
  const columns = useCategoryColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: EMPTY_CATEGORIES,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: CATEGORY_TABLE_COLUMN_PINNING,
    persistenceKey: categoriesDataGrid.persistenceKey,
  })
  return useMemo(
    () => ({
      columnReorder,
      hasPreferenceOverrides,
      isLoading: true,
      onRowClick: undefined,
      persistenceKey: categoriesDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [columnReorder, hasPreferenceOverrides, resetPreferences, t, table],
  )
}
const EMPTY_CATEGORIES: Category["adminListItem"][] = []
