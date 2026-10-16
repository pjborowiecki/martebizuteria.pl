import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"

import { getAdminOrderStatsQuery } from "~/src/modules/order/use-cases/get-admin-order-stats"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { ADMIN_STAT_GRID_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import {
  OrderStatCard,
  formatOrderStatDisplayValue,
  resolveOrderStatValue,
} from "~/src/presentation/components/custom/pages/admin/orders/components/order-stat-card"
import { useOrdersDataGridContext } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"
import { ORDER_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/orders/orders-stats.config"

export const OrdersStats = (): JSX.Element => {
  const formatLocale = useFormatLocale()
  const { data: stats, isFetching, isStale } = useSuspenseQuery(getAdminOrderStatsQuery())
  const valuesPending = isFetching && isStale
  const { activeStatFilter, applyOrderStatFilter } = useOrdersDataGridContext()

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
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
                    locale: formatLocale,
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
