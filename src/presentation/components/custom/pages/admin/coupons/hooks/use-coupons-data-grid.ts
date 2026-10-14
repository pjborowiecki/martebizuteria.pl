import { useCallback, useEffect, useMemo, useState } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { type PaginationState } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { LIST_PAGE_STEP } from "~/src/modules/_core/utils/pagination"
import {
  ADMIN_DISCOUNTS_PAGE_SIZE,
  ADMIN_DISCOUNT_TABLE_COLUMN_PINNING,
  ADMIN_DISCOUNT_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type DiscountStatus,
  type DiscountType,
} from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { getAdminDiscountsPageQuery } from "~/src/modules/discount/use-cases/get-admin-discounts-page"

import { useAdminDebouncedTableSearch } from "~/src/presentation/components/custom/datagrid/hooks/use-admin-debounced-table-search"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useCouponColumns } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-columns"
import { couponsDataGrid } from "~/src/presentation/components/custom/pages/admin/coupons/utils/coupons-data-grid"

const FIRST_PAGE_INDEX = 0

export const useCouponsDataGrid = ({ onRowClick }: UseCouponsDataGridOptions): CouponsDataGridValue => {
  const t = useTranslations("pages.admin.coupons")
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: FIRST_PAGE_INDEX,
    pageSize: ADMIN_DISCOUNTS_PAGE_SIZE,
  })

  const [serverSearch, setServerSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<CouponsListFilters>({})
  const pageInput = useMemo(
    () => ({
      page: pagination.pageIndex + LIST_PAGE_STEP,
      pageSize: pagination.pageSize,
      search: serverSearch === "" ? undefined : serverSearch,
      status: activeFilters.status,
      type: activeFilters.type,
    }),
    [activeFilters.status, activeFilters.type, pagination.pageIndex, pagination.pageSize, serverSearch],
  )

  const {
    data = EMPTY_COUPONS_PAGE,
    isFetching,
    isPending,
  } = useQuery({
    ...getAdminDiscountsPageQuery(pageInput),
    placeholderData: keepPreviousData,
  })

  const columns = useCouponColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultColumnVisibility: ADMIN_DISCOUNT_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_DISCOUNTS_PAGE_SIZE,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: ADMIN_DISCOUNT_TABLE_COLUMN_PINNING,
    manualPagination: true,
    onPaginationChange: setPagination,
    pageCount: Math.ceil(data.total / pagination.pageSize),
    pagination,
    persistenceKey: couponsDataGrid.persistenceKey,
    rowCount: data.total,
  })

  const { debouncedSearch } = useAdminDebouncedTableSearch(table)
  useEffect(() => {
    setServerSearch(debouncedSearch)
    setPagination((previous) => ({
      ...previous,
      pageIndex: FIRST_PAGE_INDEX,
    }))
  }, [debouncedSearch])

  const applyCouponsFilter = useCallback(
    (filters: CouponsListFilters) => {
      setActiveFilters((previous) => ({
        ...previous,
        ...filters,
      }))
      setPagination((previous) => ({
        ...previous,
        pageIndex: FIRST_PAGE_INDEX,
      }))
      table.resetRowSelection()
    },
    [table],
  )

  const showSkeletonRows = isFetching || isPending

  return useMemo(
    () => ({
      activeFilters,
      applyCouponsFilter,
      columnReorder,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      persistenceKey: couponsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("actions.searchPlaceholder"),
      table,
    }),
    [activeFilters, applyCouponsFilter, columnReorder, hasPreferenceOverrides, onRowClick, resetPreferences, showSkeletonRows, t, table],
  )
}

const isCouponsDataGridValue = (value: DataGridContextValue<Discount["adminListItem"]>): value is CouponsDataGridValue =>
  "applyCouponsFilter" in value && typeof value.applyCouponsFilter === "function"

export const useCouponsDataGridContext = (): CouponsDataGridValue => {
  const value = couponsDataGrid.useDataGrid()
  if (!isCouponsDataGridValue(value)) {
    throw new Error("useCouponsDataGridContext must be used within the coupons table Provider.")
  }

  return value
}

const EMPTY_COUPONS_PAGE = {
  hasMore: false,
  items: [] as Discount["adminListItem"][],
  limit: ADMIN_DISCOUNTS_PAGE_SIZE,
  offset: 0,
  total: 0,
} as const

export interface CouponsListFilters {
  readonly status?: DiscountStatus | undefined
  readonly type?: DiscountType | undefined
}

export interface CouponsDataGridValue extends DataGridContextValue<Discount["adminListItem"]> {
  readonly activeFilters: CouponsListFilters
  readonly applyCouponsFilter: (filters: CouponsListFilters) => void
}

interface UseCouponsDataGridOptions {
  readonly onRowClick?: ((coupon: Discount["adminListItem"]) => void) | undefined
}
