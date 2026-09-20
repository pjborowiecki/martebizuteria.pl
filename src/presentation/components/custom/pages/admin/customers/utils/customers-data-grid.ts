import { type User } from "~/src/modules/user/user.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const CUSTOMERS_DATA_GRID_KEY = "admin.customers"

export const customersDataGrid = createDataGrid<User["adminCustomerListItem"]>({
  persistenceKey: CUSTOMERS_DATA_GRID_KEY,
})
