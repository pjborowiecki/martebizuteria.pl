import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const LOGIN_HISTORY_DATA_GRID_KEY = "admin.settings.login-history:v1"

export const loginHistoryDataGrid = createDataGrid<AuditLog["customerLoginHistoryItem"]>({
  persistenceKey: LOGIN_HISTORY_DATA_GRID_KEY,
})
