import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { BadgePercent, Tag, TicketCheck, Wallet } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { getDiscountStatsQuery } from "~/src/modules/discount/use-cases/get-admin-discount-stats"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

export const CouponStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.stats")
  const locale = useLocale()
  const { data: stats } = useSuspenseQuery(getDiscountStatsQuery())

  return (
    <div className="mb-5 grid shrink-0 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <CouponStatCard icon={<BadgePercent className={ICON_CLASS} strokeWidth={1.5} />} label={t("activeCoupons")} value={stats.active} />
      <CouponStatCard icon={<Tag className={ICON_CLASS} strokeWidth={1.5} />} label={t("totalCoupons")} value={stats.total} />
      <CouponStatCard
        icon={<TicketCheck className={ICON_CLASS} strokeWidth={1.5} />}
        label={t("totalRedemptions")}
        value={stats.redemptions}
      />
      <CouponStatCard
        icon={<Wallet className={ICON_CLASS} strokeWidth={1.5} />}
        label={t("revenueGivenAway")}
        value={formatPrice(stats.redeemedTotalMinorUnits, stats.currencyCode, locale)}
      />
    </div>
  )
}

const CouponStatCard = ({ icon, label, value }: Readonly<CouponStatCardProps>): JSX.Element => (
  <Card className="overflow-hidden shadow-none">
    <CardContent className="flex items-start justify-between p-5">
      <div>
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </div>
      {icon}
    </CardContent>
  </Card>
)

const ICON_CLASS = "size-5 text-muted-foreground/40"

interface CouponStatCardProps {
  readonly icon: JSX.Element
  readonly label: string
  readonly value: number | string
}
