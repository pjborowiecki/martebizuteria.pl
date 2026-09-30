import { type JSX } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Order } from "~/src/modules/order/order.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"
import { OrderLineItemRow } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-line-item-row"

export const OrderLineItemsCard = ({ order }: Readonly<OrderLineItemsCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const locale = useLocale()

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-medium">
            {t("orderDetail.items.title")}
            <span className="ml-2 text-muted-foreground/50">({order.items.length})</span>
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`pl-5 ${HEADER_CLASS}`}>{t("orderDetail.items.columns.product")}</TableHead>
              <TableHead className={HEADER_CLASS}>{t("orderDetail.items.columns.sku")}</TableHead>
              <TableHead className={`text-center ${HEADER_CLASS}`}>{t("orderDetail.items.columns.qty")}</TableHead>
              <TableHead className={`text-right ${HEADER_CLASS}`}>{t("orderDetail.items.columns.price")}</TableHead>
              <TableHead className={`pr-5 text-right ${HEADER_CLASS}`}>{t("orderDetail.items.columns.total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <OrderLineItemRow currencyCode={order.currencyCode} item={item} key={item.id} />
            ))}
          </TableBody>
        </Table>

        <Separator className="bg-border/40" />

        <div className="ml-auto max-w-xs space-y-2 px-5 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("orderDetail.summary.subtotal")}</span>
            <span className="font-mono">{formatPrice(order.subtotalMinorUnits, order.currencyCode, locale)}</span>
          </div>
          {order.discountTotalMinorUnits > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("orderDetail.summary.discount")}</span>
              <span className="font-mono">−{formatPrice(order.discountTotalMinorUnits, order.currencyCode, locale)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("orderDetail.summary.shipping")}
              {order.delivery !== undefined && (
                <span className="ml-1 text-[11px] text-muted-foreground/40">({order.delivery.methodName})</span>
              )}
            </span>
            <span className="font-mono">{formatPrice(order.shippingTotalMinorUnits, order.currencyCode, locale)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("orderDetail.summary.tax")}</span>
            <span className="font-mono">{formatPrice(order.taxTotalMinorUnits, order.currencyCode, locale)}</span>
          </div>
          <Separator className="bg-border/40" />
          <div className="flex justify-between pt-1">
            <span className="text-sm font-medium">{t("orderDetail.summary.total")}</span>
            <span className="font-mono text-base font-semibold">{formatPrice(order.totalMinorUnits, order.currencyCode, locale)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const HEADER_CLASS = "text-xs font-medium uppercase tracking-wider text-muted-foreground/60"

interface OrderLineItemsCardProps {
  readonly order: Order["adminOrderDetail"]
}
