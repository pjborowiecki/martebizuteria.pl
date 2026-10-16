import { useMemo } from "react"

import { type Table } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { CATEGORY_STATUS_LABEL_KEYS, CATEGORY_TABLE_COLUMN_ID } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { type DataGridExportSource, exportFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { catalogFilterLabelKey } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-filter-label"

export const CATEGORIES_EXPORT_LIST = "categories"

export const useCategoriesExportSource = (
  table: Table<DataGridFeatures, ProductCategory["adminListItem"]>,
): DataGridExportSource<ProductCategory["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.categories")
  const statusKey = catalogFilterLabelKey(table.getColumn(CATEGORY_TABLE_COLUMN_ID.status)?.getFilterValue(), CATEGORY_STATUS_LABEL_KEYS)

  return useMemo(
    () => ({
      filters: exportFilter(t("columns.status"), statusKey === undefined ? undefined : t(statusKey)),
      list: CATEGORIES_EXPORT_LIST,
      title: t("title"),
    }),
    [statusKey, t],
  )
}
