import { useCallback, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import {
  ADMIN_DELIVERY_METHODS_PAGE_SIZE,
  DELIVERY_METHOD_STATUSES,
  DELIVERY_METHOD_TABLE_COLUMN_ID,
  DELIVERY_METHOD_TABLE_COLUMN_PINNING,
  DELIVERY_METHOD_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type DeliveryMethodStatus,
} from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { listAdminDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-admin-delivery-methods"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { createCatalogTableGlobalFilterFn } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import { type DataGridExportSource, exportFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridContextValue, type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds, getDataGridSearch } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import {
  deliveryMethodStatusLabel,
  useDeliveryMethodColumns,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-columns"
import { useDeliveryMethodOrdering } from "~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-method-ordering"
import { useDeliveryMethodActions } from "~/src/presentation/components/custom/pages/admin/settings/delivery/use-delivery-method-actions"
import { deliveryMethodsDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/delivery/utils/delivery-methods-data-grid"

export const DELIVERY_METHODS_EXPORT_LIST = "delivery-methods"

export const useDeliveryMethodsDataGrid = ({ onRowClick }: Readonly<UseDeliveryMethodsDataGridOptions>): DeliveryMethodsDataGridValue => {
  const t = useTranslations("pages.admin.settings.delivery")
  const tGrid = useTranslations("components.datagrid")
  const locale = useLocale()
  const { data, isFetching } = useSuspenseQuery(listAdminDeliveryMethodsQuery())
  const methods = useMemo(
    () => [
      ...data.methods.filter((method) => method.archivedAt === undefined),
      ...data.methods.filter((method) => method.archivedAt !== undefined),
    ],
    [data.methods],
  )
  const { reorder } = useDeliveryMethodActions()
  const ordering = useDeliveryMethodOrdering(methods, reorder)
  const columns = useDeliveryMethodColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<DeliveryMethod["adminMethod"]>((row) => [
        resolveLocalizedString(row.names, locale),
        ...Object.values(row.names),
        t(`methods.types.${row.type}`),
        row.courier.name,
        deliveryMethodStatusLabel(row, t),
      ]),
    [locale, t],
  )

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: ordering.items,
    defaultColumnVisibility: DELIVERY_METHOD_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_DELIVERY_METHODS_PAGE_SIZE,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: DELIVERY_METHOD_TABLE_COLUMN_PINNING,
    persistenceKey: deliveryMethodsDataGrid.persistenceKey,
  })

  const statusColumn = table.getColumn(DELIVERY_METHOD_TABLE_COLUMN_ID.status)
  const statusFilter = statusColumn?.getFilterValue()
  const activeStatus = DELIVERY_METHOD_STATUSES.find((status) => status === statusFilter)
  const applyStatusFilter = useCallback(
    (status?: DeliveryMethodStatus) => {
      statusColumn?.setFilterValue(status)
      table.setPageIndex(0)
    },
    [statusColumn, table],
  )

  const naturalOrder =
    table.atoms.sorting.get().length === 0 && getDataGridSearch(table).trim() === "" && table.atoms.columnFilters.get().length === 0

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

  const exportSource = useMemo<DataGridExportSource<DeliveryMethod["adminMethod"]>>(
    () => ({
      filters: exportFilter(tGrid("export.filters.quickFilter"), activeStatus === undefined ? undefined : t(`status.${activeStatus}`)),
      list: DELIVERY_METHODS_EXPORT_LIST,
      title: t("title"),
    }),
    [activeStatus, t, tGrid],
  )

  return useMemo(
    () => ({
      activeStatus,
      applyStatusFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      isLoading: isFetching,
      onRowClick,
      persistenceKey: deliveryMethodsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [
      activeStatus,
      applyStatusFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      isFetching,
      onRowClick,
      resetPreferences,
      rowReorder,
      t,
      table,
    ],
  )
}

const isDeliveryMethodsDataGridValue = (
  value: DataGridContextValue<DeliveryMethod["adminMethod"]>,
): value is DeliveryMethodsDataGridValue => "applyStatusFilter" in value

export const useDeliveryMethodsDataGridContext = (): DeliveryMethodsDataGridValue => {
  const value = deliveryMethodsDataGrid.useDataGrid()
  if (!isDeliveryMethodsDataGridValue(value)) {
    throw new Error("useDeliveryMethodsDataGridContext must be used within the delivery methods table Provider.")
  }

  return value
}

export interface DeliveryMethodsDataGridValue extends DataGridContextValue<DeliveryMethod["adminMethod"]> {
  readonly activeStatus: DeliveryMethodStatus | undefined
  readonly applyStatusFilter: (status?: DeliveryMethodStatus) => void
}

interface UseDeliveryMethodsDataGridOptions {
  readonly onRowClick: (method: DeliveryMethod["adminMethod"]) => void
}
