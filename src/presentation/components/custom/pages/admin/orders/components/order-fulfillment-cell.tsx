import { type JSX } from "react"

import { useTranslations } from "use-intl"

import {
  ADMIN_ORDER_FULFILLMENT_LABEL_KEYS,
  FULFILLMENT_DOT_COLORS,
  isAdminOrderFulfillmentUiKey,
} from "~/src/modules/order/order.constants"
export const OrderFulfillmentCell = ({ fulfillmentUiKey }: Readonly<OrderFulfillmentCellProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const dotColor = FULFILLMENT_DOT_COLORS[fulfillmentUiKey] ?? DEFAULT_DOT_COLOR
  const label = isAdminOrderFulfillmentUiKey(fulfillmentUiKey) ? t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[fulfillmentUiKey]) : fulfillmentUiKey
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${dotColor}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </span>
  )
}
const DEFAULT_DOT_COLOR = "bg-muted-foreground/30"
interface OrderFulfillmentCellProps {
  readonly fulfillmentUiKey: string
}
