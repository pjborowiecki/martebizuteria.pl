import { type JSX } from "react"

import { ArrowUpRight, CreditCard, ShoppingBag, TrendingUp } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type User } from "~/src/modules/user/user.types"
import { formatAdminCustomerDetailKpiPrice } from "~/src/modules/user/user.utils"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CONTENT_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminStatValue } from "~/src/presentation/components/custom/pages/admin/admin-stat-value"
import { CUSTOMER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/_styles/customer-detail.styles"

export const CustomerKpis = ({ customer }: CustomerKpisProps): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const formatLocale = useFormatLocale()
  const kpis = [
    {
      color: "text-foreground",
      icon: CreditCard,
      label: t("kpi.totalSpent"),
      value: formatAdminCustomerDetailKpiPrice(customer.totalSpent, formatLocale),
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
      value: formatAdminCustomerDetailKpiPrice(customer.averageOrderValue, formatLocale),
    },
    {
      color: customer.isReturning ? "text-emerald-600" : "text-foreground",
      icon: ArrowUpRight,
      label: t("kpi.returnRate"),
      value: `${customer.returningRate}%`,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 2xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className={CUSTOMER_DETAIL_CARD_CLASS}>
          <CardContent className={ADMIN_CARD_CONTENT_CLASS}>
            <div className="flex items-center gap-2">
              <div className="hidden size-8 items-center justify-center rounded-md bg-secondary sm:flex">
                <kpi.icon className={`size-4 ${kpi.color}`} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
            </div>
            <AdminStatValue className="mt-3 lg:text-2xl" value={kpi.value} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface CustomerKpisProps {
  readonly customer: User["adminCustomerDetail"]
}
