import { type JSX } from "react"

import { CustomerStatCard } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-stat-card"
import { CUSTOMER_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/customers/customers-stats.config"
export const CustomersStatsFallback = (): JSX.Element => (
  <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {CUSTOMER_STAT_CARDS.map((config) => (
      <CustomerStatCard key={config.key} config={config} valuesPending />
    ))}
  </div>
)
