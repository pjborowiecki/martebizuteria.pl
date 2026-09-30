import { type JSX } from "react"

import { ArrowUpRight, Mail, Phone } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Order } from "~/src/modules/order/order.types"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

import { ROUTES } from "~/src/routes"

export const OrderCustomerCard = ({ customer, currencyCode }: Readonly<OrderCustomerCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const locale = useLocale()

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium">{t("orderDetail.customer.title")}</p>
        <div className="flex items-center gap-3">
          <Avatar className="rounded-md after:rounded-md">
            <AvatarFallback className="rounded-md bg-foreground text-xs font-medium text-background">{customer.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{customer.name}</p>
            <p className="text-[12px] text-muted-foreground">
              {customer.userId === undefined
                ? t("orderDetail.customer.guest")
                : t("orderDetail.customer.ordersCount", {
                    count: customer.orderCount,
                  })}
            </p>
          </div>
          {customer.userId !== undefined && customer.totalSpentMinorUnits > 0 && (
            <Badge className="ml-auto text-[11px]" variant="secondary">
              {formatPrice(customer.totalSpentMinorUnits, currencyCode, locale)}
            </Badge>
          )}
        </div>
        <Separator className="my-4 bg-border/40" />
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="truncate text-muted-foreground">{customer.email}</span>
          </div>
          {customer.phone !== undefined && (
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-muted-foreground">{customer.phone}</span>
            </div>
          )}
        </div>
        {customer.userId !== undefined && (
          <LocalizedLink
            className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            params={{ id: customer.userId }}
            to={ROUTES.ADMIN_CUSTOMER}
          >
            {t("orderDetail.customer.viewProfile")}
            <ArrowUpRight className="size-3" strokeWidth={2} />
          </LocalizedLink>
        )}
      </CardContent>
    </Card>
  )
}

interface OrderCustomerCardProps {
  readonly currencyCode: string
  readonly customer: Order["adminOrderDetail"]["customer"]
}
