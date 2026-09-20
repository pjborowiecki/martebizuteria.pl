import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { DEMO_BILLING } from "~/src/data/order-detail-data"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
export const OrderBillingCard = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("orderDetail.billing.title")}</p>
          <Badge className="text-[10px]" variant="outline">
            {t("orderDetail.billing.sameAsShipping")}
          </Badge>
        </div>
        <div className="space-y-1 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">{DEMO_BILLING.name}</p>
          <p>{DEMO_BILLING.line1}</p>
          <p>{DEMO_BILLING.line2}</p>
          <p>
            {DEMO_BILLING.city}
            {", "}
            {DEMO_BILLING.postcode}
          </p>
          <p>{DEMO_BILLING.country}</p>
        </div>
      </CardContent>
    </Card>
  )
}
