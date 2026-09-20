import { type JSX } from "react"

import { cn } from "cn"
import { DollarSign, Eye, ShoppingCart, Users } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "use-intl"

import { type AdminDashboardKpiStat } from "~/src/modules/admin-dashboard/admin-dashboard.types"

import { formatPrice } from "~/src/lib/currency"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { DashboardTrendBadge } from "~/src/presentation/components/custom/pages/admin/dashboard/dashboard-trend-badge"
import { useAdminDashboardSnapshot } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot"
const resolveStatValue = (key: DashboardStatKey, snapshot: ReturnType<typeof useAdminDashboardSnapshot>["data"]): AdminDashboardKpiStat => {
  switch (key) {
    case "customers": {
      return snapshot.customers
    }
    case "orders": {
      return snapshot.orders
    }
    case "revenue": {
      return snapshot.revenue
    }
    case "views": {
      return snapshot.pageViews
    }
    default: {
      return snapshot.revenue
    }
  }
}
const formatStatDisplayValue = ({
  currencyCode,
  format,
  key,
  locale,
  stat,
}: Readonly<{
  currencyCode: string
  format: ReturnType<typeof useFormatter>
  key: DashboardStatKey
  locale: string
  stat: AdminDashboardKpiStat
}>): string => {
  if (key === "revenue") {
    return formatPrice(stat.current, currencyCode, locale)
  }
  return format.number(stat.current)
}
export const DashboardStats = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const { data: snapshot } = useAdminDashboardSnapshot()
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_CARDS.map((card) => {
        const stat = resolveStatValue(card.key, snapshot)
        const displayValue = formatStatDisplayValue({
          currencyCode: snapshot.currencyCode,
          format,
          key: card.key,
          locale,
          stat,
        })
        return (
          <Card key={card.key} className={cn("border-border/40 bg-gradient-to-br shadow-none", card.gradient)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{t(`dashboard.stats.${card.key}.label`)}</span>
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                  <card.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{displayValue}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <DashboardTrendBadge trendPercent={stat.trendPercent} />
                <span className="text-xs text-muted-foreground">{t("dashboard.stats.vsPrevious")}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
const STAT_CARDS = [
  {
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    icon: DollarSign,
    key: "revenue",
  },
  {
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    icon: ShoppingCart,
    key: "orders",
  },
  {
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    icon: Users,
    key: "customers",
  },
  {
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    icon: Eye,
    key: "views",
  },
] as const
type DashboardStatKey = (typeof STAT_CARDS)[number]["key"]
