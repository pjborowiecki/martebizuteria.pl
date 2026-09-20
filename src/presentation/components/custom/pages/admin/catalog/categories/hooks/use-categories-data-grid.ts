import { useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl"

import {
  CATEGORY_STATUS,
  CATEGORY_STATUS_LABEL_KEYS,
  CATEGORY_TABLE_COLUMN_PINNING,
  CATEGORY_TABLE_DEFAULT_COLUMN_VISIBILITY,
} from "~/src/modules/product-category/product-category.constants"
import { type Category } from "~/src/modules/product-category/product-category.types"
import { adminCategoriesQueryOptions } from "~/src/modules/product-category/use-cases/get-admin-categories"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { createCatalogTableGlobalFilterFn } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import { type DataGridContextValue, type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useCategoryColumns } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-columns"
import { useCategoryOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-category-ordering"
import { useReorderCategories } from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-reorder-categories"
import { categoriesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid"
import { getCategoryAdminSearchParts } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-table-search"

export const useCategoriesDataGrid = ({ onRowClick }: UseCategoriesDataGridOptions): DataGridContextValue<Category["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.categories")
  const { data: categories, isFetching } = useSuspenseQuery(adminCategoriesQueryOptions())
  const showSkeletonRows = isFetching
  const reorder = useReorderCategories()
  const ordering = useCategoryOrdering(categories, reorder)
  const columns = useCategoryColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<Category["adminListItem"]>((row) => {
        const statusLabel = t(row.status === CATEGORY_STATUS.ACTIVE ? CATEGORY_STATUS_LABEL_KEYS.active : CATEGORY_STATUS_LABEL_KEYS.draft)
        return getCategoryAdminSearchParts(row, statusLabel)
      }),
    [t],
  )
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: ordering.items,
    defaultColumnVisibility: CATEGORY_TABLE_DEFAULT_COLUMN_VISIBILITY,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: CATEGORY_TABLE_COLUMN_PINNING,
    persistenceKey: categoriesDataGrid.persistenceKey,
  })
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
      persistenceKey: categoriesDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [columnReorder, hasPreferenceOverrides, onRowClick, resetPreferences, rowReorder, showSkeletonRows, t, table],
  )
}
interface UseCategoriesDataGridOptions {
  readonly onRowClick?: (category: Category["adminListItem"]) => void
}
