import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import {
  ADMIN_ORDER_PAYMENT_LABEL_KEYS,
  type AdminOrderPaymentStyle,
  PAYMENT_BADGE_STYLES,
  isAdminOrderPaymentUiKey,
} from "~/src/modules/order/order.constants"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const OrderPaymentBadge = ({ paymentUiKey }: Readonly<OrderPaymentBadgeProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const payStyle = PAYMENT_BADGE_STYLES[paymentUiKey] ?? DEFAULT_PAY_STYLE
  const label = isAdminOrderPaymentUiKey(paymentUiKey) ? t(ADMIN_ORDER_PAYMENT_LABEL_KEYS[paymentUiKey]) : paymentUiKey

  return (
    <Badge className={cn("text-[11px]", payStyle.className)} variant={payStyle.variant}>
      {label}
    </Badge>
  )
}

const DEFAULT_PAY_STYLE: AdminOrderPaymentStyle = {
  variant: "secondary",
}

interface OrderPaymentBadgeProps {
  readonly paymentUiKey: string
}
