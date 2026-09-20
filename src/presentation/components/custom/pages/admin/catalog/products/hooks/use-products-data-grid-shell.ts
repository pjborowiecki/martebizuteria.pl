import { useMemo } from "react"

import { useTranslations } from "use-intl"

import { PRODUCT_TABLE_COLUMN_PINNING, PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useProductColumns } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-columns"
import { productsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"

export const useProductsDataGridShell = (): DataGridContextValue<Product["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const columns = useProductColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: EMPTY_PRODUCTS,
    defaultColumnVisibility: PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: PRODUCT_TABLE_COLUMN_PINNING,
    persistenceKey: productsDataGrid.persistenceKey,
  })
  return useMemo(
    () => ({
      columnReorder,
      hasPreferenceOverrides,
      isLoading: true,
      onRowClick: undefined,
      persistenceKey: productsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [columnReorder, hasPreferenceOverrides, resetPreferences, t, table],
  )
}
const EMPTY_PRODUCTS: Product["adminListItem"][] = []
