import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl"

import { ADMIN_ORDER_STATUS_LABEL_KEYS, ORDER_STATUS_BADGE_STYLES } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"
export const OrderStatusBadge = ({ status }: Readonly<OrderStatusBadgeProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const statusStyle = ORDER_STATUS_BADGE_STYLES[status]
  return (
    <Badge className={cn("text-[11px]", statusStyle.className)} variant={statusStyle.variant}>
      {t(ADMIN_ORDER_STATUS_LABEL_KEYS[status])}
    </Badge>
  )
}
interface OrderStatusBadgeProps {
  readonly status: Order["select"]["status"]
}
