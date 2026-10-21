import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  ADMIN_ORDER_FULFILLMENT_LABEL_KEYS,
  ADMIN_ORDER_PAYMENT_LABEL_KEYS,
  ADMIN_ORDER_STATUS_LABEL_KEYS,
  type AdminOrderStatFilter,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { exportAdminOrders } from "~/src/modules/order/use-cases/export-admin-orders"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import {
  type DataGridExportSource,
  describeAmountFilter,
  describeDateFilter,
  exportFilter,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { useAdminDateFilterDay } from "~/src/presentation/components/custom/pages/admin/lib/use-admin-date-filter-day"

export const ORDERS_EXPORT_LIST = "orders"

const ORDER_STAT_FILTER_LABEL_KEYS: Readonly<Record<AdminOrderStatFilter, string>> = {
  to_fulfil: "stats.toFulfil.label",
  total: "stats.totalOrders.label",
}

export const useOrdersExportSource = (input: Order["adminExportInput"]): DataGridExportSource<Order["adminListItem"]> => {
  const t = useTranslations("pages.admin.orders")
  const tGrid = useTranslations("components.datagrid")
  const formatLocale = useFormatLocale()
  const { formatIsoDateLabel } = useAdminDateFilterDay()

  return useMemo(() => {
    const formatAmount = (amount: number): string => formatPrice(amount, STORE_CURRENCY_CODE, formatLocale)

    return {
      filters: [
        ...exportFilter(
          tGrid("export.filters.quickFilter"),
          input.statFilter === undefined ? undefined : t(ORDER_STAT_FILTER_LABEL_KEYS[input.statFilter]),
        ),
        ...exportFilter(t("columns.status"), input.status === undefined ? undefined : t(ADMIN_ORDER_STATUS_LABEL_KEYS[input.status])),
        ...exportFilter(t("columns.payment"), input.payment === undefined ? undefined : t(ADMIN_ORDER_PAYMENT_LABEL_KEYS[input.payment])),
        ...exportFilter(
          t("columns.fulfillment"),
          input.fulfillment === undefined ? undefined : t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[input.fulfillment]),
        ),
        ...exportFilter(t("columns.total"), input.total === undefined ? undefined : describeAmountFilter(input.total, formatAmount, tGrid)),
        ...exportFilter(
          t("columns.date"),
          input.createdAt === undefined ? undefined : describeDateFilter(input.createdAt, formatIsoDateLabel, tGrid),
        ),
      ],
      list: ORDERS_EXPORT_LIST,
      loadRows: () => exportAdminOrders({ data: input }),
      search: input.search,
      title: t("title"),
    }
  }, [formatIsoDateLabel, formatLocale, input, t, tGrid])
}
