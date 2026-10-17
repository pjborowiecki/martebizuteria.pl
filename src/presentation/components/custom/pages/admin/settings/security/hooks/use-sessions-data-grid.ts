import { useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { SESSION_TABLE_COLUMN_ID } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { createCatalogTableGlobalFilterFn } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useSessionColumns } from "~/src/presentation/components/custom/pages/admin/settings/security/components/sessions-columns"
import { sessionsDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/security/utils/sessions-data-grid"

const SESSIONS_COLUMN_PINNING = { end: [SESSION_TABLE_COLUMN_ID.actions], start: [SESSION_TABLE_COLUMN_ID.device] }

const sessionSearchFilter = createCatalogTableGlobalFilterFn<CustomerAccount["session"]>((row) => [row.device, row.browser, row.ipAddress])

export const useSessionsDataGrid = (): DataGridContextValue<CustomerAccount["session"]> => {
  const t = useTranslations("pages.admin.settings.security.sessions")
  const { data, isFetching } = useSuspenseQuery(listCustomerSessionsQuery())
  const sessions = useMemo(() => [...data], [data])
  const columns = useSessionColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: sessions,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    globalFilterFn: sessionSearchFilter,
    initialColumnOrder,
    initialColumnPinning: SESSIONS_COLUMN_PINNING,
    persistenceKey: sessionsDataGrid.persistenceKey,
  })

  return useMemo(
    () => ({
      columnReorder,
      hasPreferenceOverrides,
      isLoading: isFetching,
      persistenceKey: sessionsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [columnReorder, hasPreferenceOverrides, isFetching, resetPreferences, t, table],
  )
}
