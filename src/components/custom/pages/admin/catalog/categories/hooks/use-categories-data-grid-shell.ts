import { useMemo } from "react";

import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useCategoryColumns } from "~/src/components/custom/pages/admin/catalog/categories/components/categories-columns";
import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";

import { CATEGORY_TABLE_COLUMN_PINNING } from "~/src/modules/category/category.constants";
import type { Category } from "~/src/modules/category/category.types";

const EMPTY_CATEGORIES: Category["adminListItem"][] = [];

/** Empty grid used only for layout-matched skeletons (header, toolbar, row placeholders). */
export function useCategoriesDataGridShell(): DataGridContextValue<Category["adminListItem"]> {
  const t = useTranslations("pages.admin.catalog.categories");
  const columns = useCategoryColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: EMPTY_CATEGORIES,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: CATEGORY_TABLE_COLUMN_PINNING,
    persistenceKey: categoriesDataGrid.persistenceKey
  });

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
      table
    }),
    [columnReorder, hasPreferenceOverrides, resetPreferences, t, table]
  );
}
