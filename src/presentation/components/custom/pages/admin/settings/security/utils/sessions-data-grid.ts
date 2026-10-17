import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const SESSIONS_DATA_GRID_KEY = "admin.settings.sessions:v1"

export const sessionsDataGrid = createDataGrid<CustomerAccount["session"]>({
  persistenceKey: SESSIONS_DATA_GRID_KEY,
})
