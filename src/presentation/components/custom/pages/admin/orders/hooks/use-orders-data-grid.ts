import { useCallback, useEffect, useMemo, useState } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { type ColumnFiltersState, type ColumnPinningState, type PaginationState } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { LIST_PAGE_STEP } from "~/src/modules/_core/utils/pagination"
import {
  ADMIN_ORDERS_PAGE_SIZE,
  ADMIN_ORDER_TABLE_COLUMN_PINNING,
  ADMIN_ORDER_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type AdminOrderStatFilter,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { parseAdminOrdersListFilters } from "~/src/modules/order/order.utils"
import { getAdminOrdersPageQuery } from "~/src/modules/order/use-cases/get-admin-orders-page"

import { useAdminDebouncedTableSearch } from "~/src/presentation/components/custom/datagrid/hooks/use-admin-debounced-table-search"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useOrderColumns } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-columns"
import { useOrdersExportSource } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-export-source"
import { ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

const buildAdminOrdersPageInput = ({
  listFilters,
  pageIndex,
  pageSize,
  search,
  statFilter,
  userId,
}: {
  readonly listFilters: ReturnType<typeof parseAdminOrdersListFilters>
  readonly pageIndex: number
  readonly pageSize: number
  readonly search: string
  readonly statFilter: AdminOrderStatFilter | undefined
  readonly userId: string | undefined
}): Order["adminPageInput"] => ({
  createdAt: listFilters.createdAt,
  fulfillment: listFilters.fulfillment,
  page: pageIndex + LIST_PAGE_STEP,
  pageSize,
  payment: listFilters.payment,
  search: search === "" ? undefined : search,
  statFilter,
  status: listFilters.status,
  total: listFilters.total,
  userId,
})

export const useOrdersDataGrid = ({ onRowClick, userId, view = ORDERS_PAGE_VIEW }: UseOrdersDataGridOptions): OrdersDataGridValue => {
  const t = useTranslations("pages.admin.orders")
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: view.pageSize,
  })

  const [statFilter, setStatFilter] = useState<AdminOrderStatFilter | undefined>()
  const [serverSearch, setServerSearch] = useState("")
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const listFilters = useMemo(() => parseAdminOrdersListFilters(columnFilters), [columnFilters])
  const pageInput = useMemo(
    () =>
      buildAdminOrdersPageInput({
        listFilters,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: serverSearch,
        statFilter,
        userId,
      }),
    [listFilters, pagination.pageIndex, pagination.pageSize, serverSearch, statFilter, userId],
  )

  const {
    data = EMPTY_ORDERS_PAGE,
    isFetching,
    isPending,
  } = useQuery({
    ...getAdminOrdersPageQuery(pageInput),
    placeholderData: keepPreviousData,
  })

  const showSkeletonRows = isFetching || isPending
  const orderColumns = useOrderColumns()
  const columns = useMemo(() => orderColumns.filter((column) => !view.hiddenColumnIds.has(column.id)), [orderColumns, view.hiddenColumnIds])
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultColumnVisibility: ADMIN_ORDER_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: view.pageSize,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: view.columnPinning,
    manualFiltering: true,
    manualPagination: true,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    pageCount: Math.ceil(data.total / pagination.pageSize),
    pagination,
    persistenceKey: view.persistenceKey,
    rowCount: data.total,
  })

  const { debouncedSearch } = useAdminDebouncedTableSearch(table)
  useEffect(() => {
    setServerSearch(debouncedSearch)
    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }))
  }, [debouncedSearch])
  useEffect(() => {
    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }))
  }, [columnFilters])

  const applyOrderStatFilter = useCallback((filter?: AdminOrderStatFilter) => {
    setStatFilter(filter)
    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }))
  }, [])

  const exportListInput = useMemo(
    (): Order["adminExportInput"] => ({
      createdAt: listFilters.createdAt,
      fulfillment: listFilters.fulfillment,
      payment: listFilters.payment,
      search: serverSearch === "" ? undefined : serverSearch,
      statFilter,
      status: listFilters.status,
      total: listFilters.total,
      userId,
    }),
    [listFilters, serverSearch, statFilter, userId],
  )

  const exportSource = useOrdersExportSource(exportListInput)

  return useMemo(
    () => ({
      activeStatFilter: statFilter,
      applyOrderStatFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      persistenceKey: view.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [
      applyOrderStatFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      onRowClick,
      resetPreferences,
      showSkeletonRows,
      statFilter,
      t,
      table,
      view.persistenceKey,
    ],
  )
}

const isOrdersDataGridValue = (value: DataGridContextValue<Order["adminListItem"]>): value is OrdersDataGridValue =>
  "applyOrderStatFilter" in value && typeof value.applyOrderStatFilter === "function"

export const useOrdersDataGridContext = (): OrdersDataGridValue => {
  const value = ordersDataGrid.useDataGrid()
  if (!isOrdersDataGridValue(value)) {
    throw new Error("useOrdersDataGridContext must be used within the orders table Provider.")
  }

  return value
}

const EMPTY_ORDERS_PAGE = {
  hasMore: false,
  items: [] as Order["adminListItem"][],
  limit: ADMIN_ORDERS_PAGE_SIZE,
  offset: 0,
  total: 0,
} as const

const ORDERS_PAGE_VIEW: OrdersDataGridView = {
  columnPinning: ADMIN_ORDER_TABLE_COLUMN_PINNING,
  hiddenColumnIds: new Set(),
  pageSize: ADMIN_ORDERS_PAGE_SIZE,
  persistenceKey: ordersDataGrid.persistenceKey,
}

export interface OrdersDataGridValue extends DataGridContextValue<Order["adminListItem"]> {
  readonly activeStatFilter: AdminOrderStatFilter | undefined
  readonly applyOrderStatFilter: (filter?: AdminOrderStatFilter) => void
}

export interface OrdersDataGridView {
  readonly columnPinning: ColumnPinningState
  readonly hiddenColumnIds: ReadonlySet<string | undefined>
  readonly pageSize: number
  readonly persistenceKey: string
}

interface UseOrdersDataGridOptions {
  readonly onRowClick?: ((order: Order["adminListItem"]) => void) | undefined
  readonly userId?: string | undefined
  readonly view?: OrdersDataGridView | undefined
}
