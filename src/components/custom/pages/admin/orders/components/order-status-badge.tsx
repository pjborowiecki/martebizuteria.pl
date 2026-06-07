import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Badge } from "~/src/components/shadcn/badge";

import { ADMIN_ORDER_STATUS_LABEL_KEYS, ORDER_STATUS_BADGE_STYLES, type AdminOrderStatusStyle } from "~/src/modules/order/order.constants";
import type { Order } from "~/src/modules/order/order.types";

const DEFAULT_STATUS_STYLE: AdminOrderStatusStyle = { variant: "secondary" };

interface OrderStatusBadgeProps {
  readonly status: Order["select"]["status"];
}

export function OrderStatusBadge({ status }: Readonly<OrderStatusBadgeProps>): JSX.Element {
  const t = useTranslations("pages.admin.orders");
  const statusStyle = ORDER_STATUS_BADGE_STYLES[status] ?? DEFAULT_STATUS_STYLE;

  return (
    <Badge className={cn("text-[11px]", statusStyle.className)} variant={statusStyle.variant}>
      {t(ADMIN_ORDER_STATUS_LABEL_KEYS[status])}
    </Badge>
  );
}
