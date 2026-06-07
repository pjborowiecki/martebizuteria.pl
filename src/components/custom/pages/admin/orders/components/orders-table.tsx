import { type JSX, useCallback } from "react";

import { useNavigate } from "@tanstack/react-router";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { OrdersDateColumnFilter } from "~/src/components/custom/pages/admin/orders/components/orders-date-column-filter";
import { OrdersExportAction } from "~/src/components/custom/pages/admin/orders/components/orders-export-action";
import { OrdersFulfillmentFilter } from "~/src/components/custom/pages/admin/orders/components/orders-fulfillment-filter";
import { OrdersNumericColumnFilter } from "~/src/components/custom/pages/admin/orders/components/orders-numeric-column-filter";
import { OrdersPaymentFilter } from "~/src/components/custom/pages/admin/orders/components/orders-payment-filter";
import { OrdersRefreshAction } from "~/src/components/custom/pages/admin/orders/components/orders-refresh-action";
import { OrdersStats } from "~/src/components/custom/pages/admin/orders/components/orders-stats";
import { OrdersStatusFilter } from "~/src/components/custom/pages/admin/orders/components/orders-status-filter";
import { useOrdersDataGrid } from "~/src/components/custom/pages/admin/orders/hooks/use-orders-data-grid";
import { ordersDataGrid } from "~/src/components/custom/pages/admin/orders/utils/orders-data-grid";

import { ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants";
import type { Order } from "~/src/modules/order/order.types";

const { Body, Pagination, Provider, Toolbar } = ordersDataGrid;

export function OrdersTableContent(): JSX.Element {
  const navigate = useNavigate();

  const handleRowClick = useCallback(
    (order: Order["adminListItem"]) => {
      void navigate({ params: { orderId: order.id }, to: "/{-$locale}/admin/orders/$orderId" });
    },
    [navigate]
  );

  const grid = useOrdersDataGrid({ onRowClick: handleRowClick });

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
  );
}

export function OrdersTable(): JSX.Element {
  return <OrdersTableContent />;
}
