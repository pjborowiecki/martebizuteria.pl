import { useCallback, useEffect, useMemo, useState } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { type PaginationState } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { LIST_PAGE_FIRST, LIST_PAGE_SIZE_MAX, LIST_PAGE_STEP } from "~/src/modules/_core/utils/pagination"
import { CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE, type CustomerAccountLoginStatus } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import {
  getCustomerLoginHistoryPage,
  getCustomerLoginHistoryPageQuery,
} from "~/src/modules/audit-log/use-cases/get-customer-login-history-page"

import { useAdminDebouncedTableSearch } from "~/src/presentation/components/custom/datagrid/hooks/use-admin-debounced-table-search"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridExportSource, exportFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useLoginHistoryColumns } from "~/src/presentation/components/custom/pages/admin/settings/security/components/login-history-columns"
import { loginHistoryDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/utils/login-history-data-grid"

export const LOGIN_HISTORY_EXPORT_LIST = "sign-in-history"

const EMPTY_PAGE = { items: [], total: 0 }

const loadLoginHistoryPages = async (
  input: LoginHistoryFilters,
  page: number,
): Promise<readonly AuditLog["customerLoginHistoryItem"][]> => {
  const result = await getCustomerLoginHistoryPage({ data: { ...input, page, pageSize: LIST_PAGE_SIZE_MAX } })

  return result.hasMore ? [...result.items, ...(await loadLoginHistoryPages(input, page + LIST_PAGE_STEP))] : result.items
}

export const useLoginHistoryDataGrid = (): LoginHistoryDataGridValue => {
  const t = useTranslations("pages.admin.settings.security.history")
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE })
  const [status, setStatus] = useState<CustomerAccountLoginStatus>()
  const [search, setSearch] = useState<string>()
  const filters = useMemo(() => ({ search, status }), [search, status])
  const {
    data = EMPTY_PAGE,
    isPending,
    isPlaceholderData,
  } = useQuery({
    ...getCustomerLoginHistoryPageQuery({ ...filters, page: pagination.pageIndex + LIST_PAGE_STEP, pageSize: pagination.pageSize }),
    placeholderData: keepPreviousData,
  })
  const columns = useLoginHistoryColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultPageSize: CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    initialColumnOrder,
    manualFiltering: true,
    manualPagination: true,
    onPaginationChange: setPagination,
    pageCount: Math.ceil(data.total / pagination.pageSize),
    pagination,
    persistenceKey: loginHistoryDataGrid.persistenceKey,
    rowCount: data.total,
  })

  const { debouncedSearch } = useAdminDebouncedTableSearch(table)
  useEffect(() => {
    setSearch(debouncedSearch === "" ? undefined : debouncedSearch)
    setPagination((previous) => ({ ...previous, pageIndex: 0 }))
  }, [debouncedSearch])

  const applyStatusFilter = useCallback((next?: CustomerAccountLoginStatus) => {
    setStatus(next)
    setPagination((previous) => ({ ...previous, pageIndex: 0 }))
  }, [])

  const exportSource = useMemo<DataGridExportSource<AuditLog["customerLoginHistoryItem"]>>(
    () => ({
      filters: exportFilter(t("columns.status"), status === undefined ? undefined : t(`status.${status}`)),
      list: LOGIN_HISTORY_EXPORT_LIST,
      loadRows: () => loadLoginHistoryPages(filters, LIST_PAGE_FIRST),
      search,
      title: t("title"),
    }),
    [filters, search, status, t],
  )

  return useMemo(
    () => ({
      activeStatus: status,
      applyStatusFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      isLoading: isPending || isPlaceholderData,
      persistenceKey: loginHistoryDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [
      applyStatusFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      isPending,
      isPlaceholderData,
      resetPreferences,
      status,
      t,
      table,
    ],
  )
}

const isLoginHistoryDataGridValue = (
  value: DataGridContextValue<AuditLog["customerLoginHistoryItem"]>,
): value is LoginHistoryDataGridValue => "applyStatusFilter" in value

export const useLoginHistoryDataGridContext = (): LoginHistoryDataGridValue => {
  const value = loginHistoryDataGrid.useDataGrid()
  if (!isLoginHistoryDataGridValue(value)) {
    throw new Error("useLoginHistoryDataGridContext must be used within the sign-in history table Provider.")
  }

  return value
}

interface LoginHistoryFilters {
  readonly search: string | undefined
  readonly status: CustomerAccountLoginStatus | undefined
}

export interface LoginHistoryDataGridValue extends DataGridContextValue<AuditLog["customerLoginHistoryItem"]> {
  readonly activeStatus: CustomerAccountLoginStatus | undefined
  readonly applyStatusFilter: (status?: CustomerAccountLoginStatus) => void
}
