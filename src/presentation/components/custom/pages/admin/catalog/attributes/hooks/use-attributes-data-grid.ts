import { useCallback, useMemo, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl"

import {
  ADMIN_PRODUCT_ATTRIBUTES_PAGE_SIZE,
  PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING,
  PRODUCT_ATTRIBUTE_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type ProductAttributeStatFilter,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import {
  coerceProductAttributeAllowedValues,
  filterAdminProductAttributesByStat,
  formatAdminProductAttributeAllowedValuesList,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { adminProductAttributesQueryOptions } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { createCatalogTableGlobalFilterFn } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import { type DataGridContextValue, type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useAttributeColumns } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-columns"
import { useAttributeOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attribute-ordering"
import { useReorderAttributes } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-reorder-attributes"
import { attributesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid"
import { getAttributeAdminSearchParts } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-table-search"
const isAttributesNaturalOrder = (
  table: AttributesDataGridValue["table"],
  filteredAttributes: ProductAttribute["adminListItem"][],
  attributes: ProductAttribute["adminListItem"][],
): boolean => {
  const sorting = table.atoms.sorting.get()
  const search = String(table.atoms.globalFilter.get() ?? "").trim()
  const filteredRowCount = table.getFilteredRowModel().rows.length
  const coreRowCount = table.getCoreRowModel().rows.length
  const statFilterCoversFullCatalog = filteredAttributes.length === attributes.length
  return sorting.length === 0 && search === "" && filteredRowCount === coreRowCount && statFilterCoversFullCatalog
}
export const useAttributesDataGrid = ({ onRowClick }: UseAttributesDataGridOptions): AttributesDataGridValue => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const locale = useLocale()
  const { data: attributes, isFetching } = useSuspenseQuery(adminProductAttributesQueryOptions())
  const showSkeletonRows = isFetching
  const [statFilter, setStatFilter] = useState<ProductAttributeStatFilter | undefined>()
  const filteredAttributes = useMemo(() => filterAdminProductAttributesByStat(attributes, statFilter), [attributes, statFilter])
  const reorder = useReorderAttributes()
  const ordering = useAttributeOrdering(filteredAttributes, reorder)
  const columns = useAttributeColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<ProductAttribute["adminListItem"]>((row) => {
        const typeLabel = t(`types.${row.type}`)
        const allowedValuesDisplay = formatAdminProductAttributeAllowedValuesList({
          allowedValues: coerceProductAttributeAllowedValues(row.allowedValues),
          locale,
          type: row.type,
        })
        return getAttributeAdminSearchParts(row, typeLabel, allowedValuesDisplay)
      }),
    [locale, t],
  )
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: ordering.items,
    defaultColumnVisibility: PRODUCT_ATTRIBUTE_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_PRODUCT_ATTRIBUTES_PAGE_SIZE,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING,
    persistenceKey: attributesDataGrid.persistenceKey,
  })
  const naturalOrder = isAttributesNaturalOrder(table, filteredAttributes, attributes)
  const applyAttributeStatFilter = useCallback(
    (filter?: ProductAttributeStatFilter) => {
      setStatFilter(filter)
      table.setPageIndex(0)
    },
    [table],
  )
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
      activeStatFilter: statFilter,
      applyAttributeStatFilter,
      columnReorder,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      persistenceKey: attributesDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [
      applyAttributeStatFilter,
      columnReorder,
      hasPreferenceOverrides,
      onRowClick,
      resetPreferences,
      rowReorder,
      showSkeletonRows,
      statFilter,
      t,
      table,
    ],
  )
}
const isAttributesDataGridValue = (value: DataGridContextValue<ProductAttribute["adminListItem"]>): value is AttributesDataGridValue =>
  "applyAttributeStatFilter" in value && typeof value.applyAttributeStatFilter === "function"

export const useAttributesDataGridContext = (): AttributesDataGridValue => {
  const value = attributesDataGrid.useDataGrid()
  if (!isAttributesDataGridValue(value)) {
    throw new Error("useAttributesDataGridContext must be used within the attributes table Provider.")
  }
  return value
}
export interface AttributesDataGridValue extends DataGridContextValue<ProductAttribute["adminListItem"]> {
  readonly activeStatFilter: ProductAttributeStatFilter | undefined
  readonly applyAttributeStatFilter: (filter?: ProductAttributeStatFilter) => void
}
interface UseAttributesDataGridOptions {
  readonly onRowClick?: (attribute: ProductAttribute["adminListItem"]) => void
}
