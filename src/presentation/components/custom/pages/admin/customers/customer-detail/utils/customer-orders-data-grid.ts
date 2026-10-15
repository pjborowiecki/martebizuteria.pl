import { ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"
import { DATA_GRID_DEFAULT_PAGE_SIZE } from "~/src/presentation/components/custom/datagrid/lib/data-grid-pagination.constants"
import { type OrdersDataGridView } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"

export const customerOrdersDataGrid = createDataGrid<Order["adminListItem"]>({
  persistenceKey: "admin.customer-orders",
})

export const CUSTOMER_ORDERS_VIEW: OrdersDataGridView = {
  columnPinning: {
    end: [ADMIN_ORDER_TABLE_COLUMN_ID.actions],
    start: [ADMIN_ORDER_TABLE_COLUMN_ID.orderId],
  },
  hiddenColumnIds: new Set<string>([
    ADMIN_ORDER_TABLE_COLUMN_ID.customer,
    ADMIN_ORDER_TABLE_COLUMN_ID.email,
    ADMIN_ORDER_TABLE_COLUMN_ID.select,
  ]),
  pageSize: DATA_GRID_DEFAULT_PAGE_SIZE,
  persistenceKey: customerOrdersDataGrid.persistenceKey,
}
