import { useMemo } from "react"

import { type Table } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import {
  PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID,
  type ProductAttributeStatFilter,
  isProductAttributeType,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { type DataGridExportSource, exportFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

export const ATTRIBUTES_EXPORT_LIST = "attributes"

const ATTRIBUTE_STAT_FILTER_LABEL_KEYS: Readonly<Record<ProductAttributeStatFilter, string>> = {
  choice: "stats.withChoices.label",
  inUse: "stats.inUse.label",
  unused: "stats.unused.label",
}

export const useAttributesExportSource = (
  table: Table<DataGridFeatures, ProductAttribute["adminListItem"]>,
  statFilter: ProductAttributeStatFilter | undefined,
): DataGridExportSource<ProductAttribute["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const tGrid = useTranslations("components.datagrid")
  const typeFilter = table.getColumn(PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.type)?.getFilterValue()
  const type = typeof typeFilter === "string" && isProductAttributeType(typeFilter) ? typeFilter : undefined

  return useMemo(
    () => ({
      filters: [
        ...exportFilter(
          tGrid("export.filters.quickFilter"),
          statFilter === undefined ? undefined : t(ATTRIBUTE_STAT_FILTER_LABEL_KEYS[statFilter]),
        ),
        ...exportFilter(t("columns.type"), type === undefined ? undefined : t(`types.${type}`)),
      ],
      list: ATTRIBUTES_EXPORT_LIST,
      title: t("title"),
    }),
    [statFilter, t, tGrid, type],
  )
}
