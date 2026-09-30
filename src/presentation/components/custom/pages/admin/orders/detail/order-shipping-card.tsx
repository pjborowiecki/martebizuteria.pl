import { type JSX } from "react"

import { Clock, Copy, ExternalLink, Package, Truck } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DEMO_SHIPPING } from "~/src/data/order-detail"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"

export const OrderShippingCard = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("orderDetail.shipping.title")}</p>
          <Button className="size-7 text-muted-foreground" size="icon" variant="ghost">
            <Copy className="size-3.5" strokeWidth={1.5} />
          </Button>
        </div>
        <div className="space-y-1 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">{DEMO_SHIPPING.name}</p>
          <p>{DEMO_SHIPPING.line1}</p>
          <p>{DEMO_SHIPPING.line2}</p>
          <p>
            {DEMO_SHIPPING.city}
            {", "}
            {DEMO_SHIPPING.postcode}
          </p>
          <p>{DEMO_SHIPPING.country}</p>
        </div>
        <Separator className="my-4 bg-border/40" />
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Truck className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-muted-foreground">{DEMO_SHIPPING.method}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Package className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="font-mono text-xs text-muted-foreground">{DEMO_SHIPPING.tracking}</span>
            <Button className="ml-auto size-6 text-muted-foreground/40" size="icon" variant="ghost">
              <ExternalLink className="size-3" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-muted-foreground">
              {t("orderDetail.shipping.estimatedDelivery")}
              {": "}
              <span className="text-foreground">{DEMO_SHIPPING.estimatedDelivery}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
