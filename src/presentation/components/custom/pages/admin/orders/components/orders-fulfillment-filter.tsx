import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import {
  ADMIN_ORDER_FULFILLMENT_LABEL_KEYS,
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_TABLE_COLUMN_ID,
} from "~/src/modules/order/order.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

export const OrdersFulfillmentFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const { table } = ordersDataGrid.useDataGrid()
  const column = table.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment)
  const rawFilter = column?.getFilterValue()
  const current = typeof rawFilter === "string" ? rawFilter : ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("filter.allFulfillment"),
        value: ALL_VALUE,
      },
      {
        label: t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS.unfulfilled),
        value: ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED,
      },
      {
        label: t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS.pending),
        value: ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING,
      },
      {
        label: t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS.shipped),
        value: ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED,
      },
      {
        label: t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS.delivered),
        value: ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED,
      },
      {
        label: t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS.returned),
        value: ADMIN_ORDER_FULFILLMENT_UI_KEY.RETURNED,
      },
    ],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }
      column?.setFilterValue(value === ALL_VALUE ? undefined : value)
      table.setPageIndex(0)
    },
    [column, table],
  )

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.fulfillment")}>
        <ListFilter className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const ALL_VALUE = "all"
