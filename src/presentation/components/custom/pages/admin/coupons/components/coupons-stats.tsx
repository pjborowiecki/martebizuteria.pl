import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Discount } from "~/src/modules/discount/discount.types"
import { getDiscountStatsQuery } from "~/src/modules/discount/use-cases/get-admin-discount-stats"

import { ADMIN_STAT_GRID_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CouponStatCard } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupon-stat-card"
import {
  COUPON_STAT_CARDS,
  type CouponStatCardConfig,
  type CouponStatKey,
} from "~/src/presentation/components/custom/pages/admin/coupons/coupons-stats.config"
import {
  type CouponsListFilters,
  useCouponsDataGridContext,
} from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-data-grid"

const formatCouponStat = (key: CouponStatKey, stats: Discount["adminStats"], locale: string): string =>
  key === "redeemedTotalMinorUnits" ? formatPrice(stats[key], stats.currencyCode, locale) : stats[key].toLocaleString(locale)

const statFilterHandler = (
  { filter }: CouponStatCardConfig,
  pressed: boolean,
  applyCouponsFilter: (filters: CouponsListFilters) => void,
): (() => void) | undefined => {
  if (filter === undefined) {
    return undefined
  }

  return () => {
    applyCouponsFilter({ status: pressed ? undefined : filter.status })
  }
}

export const CouponsStats = (): JSX.Element => {
  const locale = useLocale()
  const { data: stats, isFetching, isStale } = useSuspenseQuery(getDiscountStatsQuery())
  const valuesPending = isFetching && isStale
  const { activeFilters, applyCouponsFilter } = useCouponsDataGridContext()

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
      {COUPON_STAT_CARDS.map((config) => {
        const pressed = config.filter !== undefined && config.filter.status === activeFilters.status

        return (
          <CouponStatCard
            config={config}
            displayValue={formatCouponStat(config.key, stats, locale)}
            key={config.key}
            onFilter={statFilterHandler(config, pressed, applyCouponsFilter)}
            pressed={pressed}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
