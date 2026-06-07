import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Badge } from "~/src/components/shadcn/badge";

import {
  ADMIN_ORDER_PAYMENT_LABEL_KEYS,
  isAdminOrderPaymentUiKey,
  PAYMENT_BADGE_STYLES,
  type AdminOrderPaymentStyle
} from "~/src/modules/order/order.constants";

const DEFAULT_PAY_STYLE: AdminOrderPaymentStyle = { variant: "secondary" };

interface OrderPaymentBadgeProps {
  readonly paymentUiKey: string;
}

export function OrderPaymentBadge({ paymentUiKey }: Readonly<OrderPaymentBadgeProps>): JSX.Element {
  const t = useTranslations("pages.admin.orders");
  const payStyle = PAYMENT_BADGE_STYLES[paymentUiKey] ?? DEFAULT_PAY_STYLE;
  const label = isAdminOrderPaymentUiKey(paymentUiKey) ? t(ADMIN_ORDER_PAYMENT_LABEL_KEYS[paymentUiKey]) : paymentUiKey;

  return (
    <Badge className={cn("text-[11px]", payStyle.className)} variant={payStyle.variant}>
      {label}
    </Badge>
  );
}
