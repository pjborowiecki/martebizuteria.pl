import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { Order } from "~/src/modules/order/order.types";

export const ORDERS_DATA_GRID_KEY = "admin.orders";

export const ordersDataGrid = createDataGrid<Order["adminListItem"]>({
  persistenceKey: ORDERS_DATA_GRID_KEY
});
