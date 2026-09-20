import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale } from "use-intl"

import { adminOrderStatsQueryOptions } from "~/src/modules/order/use-cases/get-admin-order-stats"

import {
  OrderStatCard,
  formatOrderStatDisplayValue,
  resolveOrderStatValue,
} from "~/src/presentation/components/custom/pages/admin/orders/components/order-stat-card"
import { useOrdersDataGridContext } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"
import { ORDER_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/orders/orders-stats.config"
export const OrdersStats = (): JSX.Element => {
  const locale = useLocale()
  const { data: stats, isFetching, isStale } = useSuspenseQuery(adminOrderStatsQueryOptions())
  const valuesPending = isFetching && isStale
  const { activeStatFilter, applyOrderStatFilter } = useOrdersDataGridContext()
  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {ORDER_STAT_CARDS.map((config) => {
        const value = resolveOrderStatValue(stats, config.key)
        return (
          <OrderStatCard
            key={config.key}
            activeFilter={activeStatFilter}
            config={config}
            currencyCode={stats.currencyCode}
            displayValue={
              valuesPending
                ? undefined
                : formatOrderStatDisplayValue({
                    currencyCode: stats.currencyCode,
                    key: config.key,
                    locale,
                    value,
                  })
            }
            onFilter={applyOrderStatFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
