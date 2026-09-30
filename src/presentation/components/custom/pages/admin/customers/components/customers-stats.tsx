import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import { getAdminCustomerStatsQuery } from "~/src/modules/user/use-cases/get-admin-customer-stats"

import {
  CustomerStatCard,
  buildCustomerStatCaption,
  formatCustomerStatDisplayValue,
} from "~/src/presentation/components/custom/pages/admin/customers/components/customer-stat-card"
import { CUSTOMER_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/customers/customers-stats.config"
import { useCustomersDataGridContext } from "~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-data-grid"

export const CustomersStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const locale = useLocale()
  const { data: resolvedStats, isFetching, isStale } = useSuspenseQuery(getAdminCustomerStatsQuery())
  const valuesPending = isFetching && isStale
  const { activeStatFilter, applyCustomerStatFilter } = useCustomersDataGridContext()

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CUSTOMER_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key]
        const caption = valuesPending
          ? undefined
          : buildCustomerStatCaption({
              key: config.key,
              t,
            })
        return (
          <CustomerStatCard
            key={config.key}
            activeFilter={activeStatFilter}
            caption={caption}
            config={config}
            displayValue={formatCustomerStatDisplayValue(config.key, value, locale)}
            onFilter={applyCustomerStatFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
