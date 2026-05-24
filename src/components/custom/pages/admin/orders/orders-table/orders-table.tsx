import type { JSX } from "react";

import { Table, TableBody } from "~/src/components/shadcn/table";

import { OrderRow } from "~/src/components/custom/pages/admin/orders/orders-table/order-row";
import { OrdersTableHeader } from "~/src/components/custom/pages/admin/orders/orders-table/orders-table-header";

import type { OrderRecord } from "~/src/data/orders-data";

interface OrdersTableProps {
  readonly orders: readonly OrderRecord[];
}

export function OrdersTable({ orders }: OrdersTableProps): JSX.Element {
  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <OrdersTableHeader />
        <TableBody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
