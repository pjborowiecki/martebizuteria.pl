import { type JSX } from "react"

import { ORDER_STATS } from "~/src/data/orders-data"

import { OrderStatCard } from "~/src/presentation/components/custom/pages/admin/orders/orders-stats/order-stat-card"
export const OrdersStats = (): JSX.Element => (
  <div className="grid shrink-0 gap-5 sm:grid-cols-4">
    {ORDER_STATS.map((stat) => (
      <OrderStatCard key={stat.key} stat={stat} />
    ))}
  </div>
)
