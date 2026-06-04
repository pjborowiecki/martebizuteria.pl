import { useMemo } from "react";

import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useProductColumns } from "~/src/components/custom/pages/admin/catalog/products/components/products-columns";
import { productsDataGrid } from "~/src/components/custom/pages/admin/catalog/products/utils/products-data-grid";

import { PRODUCT_TABLE_COLUMN_PINNING, PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY } from "~/src/modules/product/product.constants";
import type { Product } from "~/src/modules/product/product.types";

const EMPTY_PRODUCTS: Product["adminListItem"][] = [];

/** Empty grid used only for layout-matched skeletons (header, toolbar, row placeholders). */
export function useProductsDataGridShell(): DataGridContextValue<Product["adminListItem"]> {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const columns = useProductColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: EMPTY_PRODUCTS,
    defaultColumnVisibility: PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: PRODUCT_TABLE_COLUMN_PINNING,
    persistenceKey: productsDataGrid.persistenceKey
  });

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
      table
    }),
    [columnReorder, hasPreferenceOverrides, resetPreferences, t, table]
  );
}
