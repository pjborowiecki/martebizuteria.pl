import { type JSX } from "react"

import { ArrowUpRight, CreditCard, ShoppingBag, TrendingUp } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { type User } from "~/src/modules/user/user.types"
import { formatAdminCustomerDetailKpiPrice } from "~/src/modules/user/user.utils"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

export const CustomerKpis = ({ customer }: CustomerKpisProps): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const locale = useLocale()
  const kpis = [
    {
      color: "text-foreground",
      icon: CreditCard,
      label: t("kpi.totalSpent"),
      value: formatAdminCustomerDetailKpiPrice(customer.totalSpent, locale),
    },
    {
      color: "text-foreground",
      icon: ShoppingBag,
      label: t("kpi.orders"),
      value: String(customer.orderCount),
    },
    {
      color: "text-foreground",
      icon: TrendingUp,
      label: t("kpi.avgOrder"),
      value: formatAdminCustomerDetailKpiPrice(customer.averageOrderValue, locale),
    },
    {
      color: customer.isReturning ? "text-emerald-600" : "text-foreground",
      icon: ArrowUpRight,
      label: t("kpi.returnRate"),
      value: `${customer.returningRate}%`,
    },
  ]

  return (
    <div className="grid gap-5 sm:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-secondary">
                <kpi.icon className={`size-4 ${kpi.color}`} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface CustomerKpisProps {
  readonly customer: User["adminCustomerDetail"]
}
