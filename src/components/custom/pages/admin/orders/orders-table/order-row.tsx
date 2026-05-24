import { type JSX, type MouseEvent, useCallback } from "react";

import { useRouter } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { TableCell, TableRow } from "~/src/components/shadcn/table";

import { OrderCustomerCell } from "~/src/components/custom/pages/admin/orders/orders-table/order-customer-cell";
import { OrderRowActions } from "~/src/components/custom/pages/admin/orders/orders-table/order-row-actions";

import { type OrderRecord, type PaymentStyle, FULFILLMENT_DOT_COLORS, PAYMENT_BADGE_STYLES } from "~/src/data/orders-data";

const DEFAULT_PAY_STYLE: PaymentStyle = { variant: "secondary" };
const DEFAULT_DOT_COLOR = "bg-muted-foreground/30";

interface OrderRowProps {
  readonly order: OrderRecord;
}

export function OrderRow({ order }: OrderRowProps): JSX.Element {
  const t = useTranslations("admin");
  const router = useRouter();
  const payStyle = PAYMENT_BADGE_STYLES[order.payment] ?? DEFAULT_PAY_STYLE;
  const dotColor = FULFILLMENT_DOT_COLORS[order.fulfillment] ?? DEFAULT_DOT_COLOR;

  const handleRowClick = useCallback(() => {
    void router.navigate({
      to: `/{-$locale}/admin/orders/${order.id}`
    });
  }, [router, order.id]);

  const handleCellClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <TableRow className="group cursor-pointer" onClick={handleRowClick}>
      <TableCell className="pl-6" onClick={handleCellClick}>
        <input className="size-4 rounded border-border accent-foreground" type="checkbox" />
      </TableCell>
      <TableCell className="font-mono text-sm font-medium">{`#${order.id}`}</TableCell>
      <TableCell>
        <OrderCustomerCell customer={order.customer} customerId={order.customerId} email={order.email} initials={order.initials} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
      <TableCell className="text-center font-mono text-sm text-muted-foreground">{order.items}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">{order.total}</TableCell>
      <TableCell>
        <Badge className={cn("text-[11px]", payStyle.className)} variant={payStyle.variant}>
          {t(`orders.payment.${order.payment}`)}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${dotColor}`} />
          <span className="text-sm text-muted-foreground">{t(`orders.fulfillment.${order.fulfillment}`)}</span>
        </span>
      </TableCell>
      <TableCell className="pr-6" onClick={handleCellClick}>
        <OrderRowActions orderId={order.id}>
          <Button className="size-8 opacity-0 transition-opacity group-hover:opacity-100" size="icon" variant="ghost">
            <MoreHorizontal className="size-4" strokeWidth={1.5} />
          </Button>
        </OrderRowActions>
      </TableCell>
    </TableRow>
  );
}
