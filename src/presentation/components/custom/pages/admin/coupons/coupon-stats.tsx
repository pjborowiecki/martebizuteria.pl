import { type JSX } from "react"

import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { useTranslations } from "use-intl/react"

import { COUPON_STATS } from "~/src/data/coupons"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

export const CouponStats = (): JSX.Element => (
  <div className="mb-5 grid shrink-0 gap-5 sm:grid-cols-4">
    {COUPON_STATS.map((stat) => (
      <CouponStatCard key={stat.key} stat={stat} />
    ))}
  </div>
)

const CouponStatCard = ({ stat }: { stat: (typeof COUPON_STATS)[number] }): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className="overflow-hidden shadow-none">
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">{t(`coupons.stats.${stat.key}.label`)}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{t(`coupons.stats.${stat.key}.value`)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <StatTrend trend={stat.trend} up={stat.up} />
              <span className="text-[11px] text-muted-foreground/50">{t("dashboard.stats.vsPrevious")}</span>
            </div>
          </div>
          <CouponStatSparkline stat={stat} />
        </div>
      </CardContent>
    </Card>
  )
}

const StatGradient = ({ color, id }: { readonly color: string; readonly id: string }): JSX.Element => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  </defs>
)

const CouponStatSparkline = ({ stat }: { readonly stat: (typeof COUPON_STATS)[number] }): JSX.Element => (
  <div className="h-12 w-24 min-w-0 shrink-0">
    <ResponsiveContainer width={96} height={48}>
      <AreaChart data={stat.spark}>
        <StatGradient id={`cpn-grad-${stat.key}`} color={stat.color} />
        <Area type="monotone" dataKey="v" stroke={stat.color} strokeWidth={1.5} fill={`url(#cpn-grad-${stat.key})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

const StatTrend = ({ trend, up }: { readonly trend: string; readonly up: boolean }): JSX.Element => {
  if (up) {
    return (
      <span className="flex items-center gap-0.5 text-[12px] text-emerald-600">
        <ArrowUpRight className="size-3.5" strokeWidth={2} />
        {trend}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-0.5 text-[12px] text-red-500">
      <ArrowDownRight className="size-3.5" strokeWidth={2} />
      {trend}
    </span>
  )
}
