import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Table, TableBody, TableCell, TableRow } from "~/src/components/shadcn/table";

import { OrderRow } from "~/src/components/custom/pages/admin/orders/orders-table/order-row";
import { OrdersTableHeader } from "~/src/components/custom/pages/admin/orders/orders-table/orders-table-header";

import type { Order } from "~/src/modules/order/order.types";

const SKELETON_ROW_COUNT = 8;
const EMPTY_ORDERS = 0;

interface OrdersTableProps {
  readonly isLoading?: boolean;
  readonly orders: readonly Order["adminListItem"][];
}

function renderOrdersTableBody(
  isLoading: boolean,
  orders: readonly Order["adminListItem"][],
  emptyLabel: string
): JSX.Element | JSX.Element[] {
  if (isLoading) {
    return Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
      <TableRow key={`orders-skeleton-${index}`}>
        <TableCell className="pl-6" colSpan={9}>
          <div className="h-10 animate-pulse rounded-md bg-muted/40" />
        </TableCell>
      </TableRow>
    ));
  }

  if (orders.length === EMPTY_ORDERS) {
    return (
      <TableRow>
        <TableCell className="py-10 text-center text-sm text-muted-foreground" colSpan={9}>
          {emptyLabel}
        </TableCell>
      </TableRow>
    );
  }

  return orders.map((order) => <OrderRow key={order.id} order={order} />);
}

export function OrdersTable({ isLoading = false, orders }: OrdersTableProps): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <OrdersTableHeader />
        <TableBody>{renderOrdersTableBody(isLoading, orders, t("orders.empty"))}</TableBody>
      </Table>
    </div>
  );
}
