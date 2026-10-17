import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const LOGIN_HISTORY_DATA_GRID_KEY = "admin.settings.login-history:v1"

export const loginHistoryDataGrid = createDataGrid<CustomerAccount["loginHistoryItem"]>({
  persistenceKey: LOGIN_HISTORY_DATA_GRID_KEY,
})
