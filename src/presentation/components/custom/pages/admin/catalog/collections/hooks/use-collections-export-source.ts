import { useMemo } from "react"

import { type Table } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { COLLECTION_STATUS_LABEL_KEYS, COLLECTION_TABLE_COLUMN_ID } from "~/src/modules/product-collection/product-collection.constants"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { type DataGridExportSource, exportFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { catalogFilterLabelKey } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-filter-label"

export const COLLECTIONS_EXPORT_LIST = "collections"

export const useCollectionsExportSource = (
  table: Table<DataGridFeatures, ProductCollection["adminListItem"]>,
): DataGridExportSource<ProductCollection["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.collections")
  const statusKey = catalogFilterLabelKey(
    table.getColumn(COLLECTION_TABLE_COLUMN_ID.status)?.getFilterValue(),
    COLLECTION_STATUS_LABEL_KEYS,
  )

  return useMemo(
    () => ({
      filters: exportFilter(t("columns.status"), statusKey === undefined ? undefined : t(statusKey)),
      list: COLLECTIONS_EXPORT_LIST,
      title: t("title"),
    }),
    [statusKey, t],
  )
}
