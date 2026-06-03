import { useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import { createCatalogTableGlobalFilterFn } from "~/src/components/custom/datagrid/lib/catalog-table-global-filter";
import type { DataGridContextValue, RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useCategoryColumns } from "~/src/components/custom/pages/admin/catalog/categories/components/categories-columns";
import { useCategoryOrdering } from "~/src/components/custom/pages/admin/catalog/categories/hooks/use-category-ordering";
import { useReorderCategories } from "~/src/components/custom/pages/admin/catalog/categories/hooks/use-reorder-categories";
import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";
import { getCategoryAdminSearchParts } from "~/src/components/custom/pages/admin/catalog/lib/catalog-admin-table-search";

import {
  CATEGORY_STATUS,
  CATEGORY_STATUS_LABEL_KEYS,
  CATEGORY_TABLE_COLUMN_PINNING,
  CATEGORY_TABLE_DEFAULT_COLUMN_VISIBILITY
} from "~/src/modules/category/category.constants";
import { categoryQueryOptions } from "~/src/modules/category/category.queries";
import type { Category } from "~/src/modules/category/category.types";

const NONE = 0;

/**
 * Assembles the categories datagrid. List data is loaded via `useSuspenseQuery`
 * (prefetched in the route loader); `isFetching` drives skeleton rows on refresh.
 */
interface UseCategoriesDataGridOptions {
  readonly onRowClick?: (category: Category["adminListItem"]) => void;
}

export function useCategoriesDataGrid({ onRowClick }: UseCategoriesDataGridOptions): DataGridContextValue<Category["adminListItem"]> {
  const t = useTranslations("admin");
  const { data: categories, isFetching } = useSuspenseQuery(categoryQueryOptions.adminCategoriesQueryOptions());
  const showSkeletonRows = isFetching;

  const reorder = useReorderCategories();
  const ordering = useCategoryOrdering(categories, reorder);
  const columns = useCategoryColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<Category["adminListItem"]>((row) => {
        const statusLabel = t(row.status === CATEGORY_STATUS.ACTIVE ? CATEGORY_STATUS_LABEL_KEYS.active : CATEGORY_STATUS_LABEL_KEYS.draft);
        return getCategoryAdminSearchParts(row, statusLabel);
      }),
    [t]
  );

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: ordering.items,
    defaultColumnVisibility: CATEGORY_TABLE_DEFAULT_COLUMN_VISIBILITY,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: CATEGORY_TABLE_COLUMN_PINNING,
    persistenceKey: categoriesDataGrid.persistenceKey
  });

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
      persistenceKey: categoriesDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("categories.searchPlaceholder"),
      table
    }),
    [columnReorder, hasPreferenceOverrides, onRowClick, resetPreferences, rowReorder, showSkeletonRows, t, table]
  );
}
