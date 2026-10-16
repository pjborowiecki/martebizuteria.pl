import { type JSX } from "react"

import { ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { OrdersDateColumnFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-date-column-filter"
import { OrdersExportAction } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-export-action"
import { OrdersFulfillmentFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-fulfillment-filter"
import { OrdersNumericColumnFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-numeric-column-filter"
import { OrdersPaymentFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-payment-filter"
import { OrdersRefreshAction } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-refresh-action"
import { OrdersStats } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-stats"
import { OrdersStatusFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-status-filter"
import { useOpenOrder } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-open-order"
import { useOrdersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"
import { ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

export const OrdersTableContent = (): JSX.Element => {
  const openOrder = useOpenOrder()
  const grid = useOrdersDataGrid({
    onRowClick: openOrder,
  })

  return (
    <Provider value={grid}>
      <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
        <OrdersStats />
        <DataGridShell>
          <Toolbar
            filters={
              <>
                <OrdersStatusFilter />
                <OrdersPaymentFilter />
                <OrdersFulfillmentFilter />
                <OrdersNumericColumnFilter
                  ariaLabelKey="filter.total"
                  columnId={ADMIN_ORDER_TABLE_COLUMN_ID.total}
                  labelKey="columns.total"
                />
                <OrdersDateColumnFilter
                  ariaLabelKey="filter.createdAt"
                  columnId={ADMIN_ORDER_TABLE_COLUMN_ID.createdAt}
                  labelKey="columns.date"
                />
              </>
            }
          >
            <OrdersRefreshAction />
            <OrdersExportAction />
          </Toolbar>
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  )
}

export const OrdersTable = (): JSX.Element => <OrdersTableContent />

const { Body, Pagination, Provider, Toolbar } = ordersDataGrid
