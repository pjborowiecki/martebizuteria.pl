import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import {
  ADMIN_ORDER_FULFILLMENT_LABEL_KEYS,
  FULFILLMENT_DOT_COLORS,
  isAdminOrderFulfillmentUiKey,
} from "~/src/modules/order/order.constants"

import { CatalogTruncatedTextCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"

export const OrderFulfillmentCell = ({ fulfillmentUiKey }: Readonly<OrderFulfillmentCellProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const dotColor = FULFILLMENT_DOT_COLORS[fulfillmentUiKey] ?? DEFAULT_DOT_COLOR
  const label = isAdminOrderFulfillmentUiKey(fulfillmentUiKey) ? t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[fulfillmentUiKey]) : fulfillmentUiKey

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={`size-2 shrink-0 rounded-full ${dotColor}`} />
      <CatalogTruncatedTextCell className="text-sm" text={label} />
    </span>
  )
}

const DEFAULT_DOT_COLOR = "bg-muted-foreground/30"

interface OrderFulfillmentCellProps {
  readonly fulfillmentUiKey: string
}
