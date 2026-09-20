import { type Order } from "~/src/modules/order/order.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const ORDERS_DATA_GRID_KEY = "admin.orders"

export const ordersDataGrid = createDataGrid<Order["adminListItem"]>({
  persistenceKey: ORDERS_DATA_GRID_KEY,
})
