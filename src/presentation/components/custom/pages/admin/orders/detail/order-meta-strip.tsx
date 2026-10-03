import { type JSX } from "react"

import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { ORDER_STATUS_BADGE_STYLES, PAYMENT_BADGE_STYLES } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderMetaStrip = ({ order }: Readonly<OrderMetaStripProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const statusStyle = ORDER_STATUS_BADGE_STYLES[order.status]
  const paymentStyle = PAYMENT_BADGE_STYLES[order.paymentUiKey]

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <div>
          <p className={LABEL_CLASS}>{t("orderDetail.meta.date")}</p>
          <p className="mt-0.5 text-sm">
            {format.dateTime(order.createdAt, {
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className={LABEL_CLASS}>{t("orderDetail.meta.status")}</p>
          <Badge className={`mt-1 text-[11px] ${statusStyle.className ?? ""}`} variant={statusStyle.variant}>
            {t(`orderDetail.orderStatus.${order.status}`)}
          </Badge>
        </div>
        <div>
          <p className={LABEL_CLASS}>{t("orderDetail.meta.fulfillment")}</p>
          <Badge className="mt-1 text-[11px]" variant="outline">
            {t(`orderDetail.status.${order.fulfillmentUiKey}`)}
          </Badge>
        </div>
        <div>
          <p className={LABEL_CLASS}>{t("orderDetail.meta.payment")}</p>
          <Badge className={`mt-1 text-[11px] ${paymentStyle?.className ?? ""}`} variant={paymentStyle?.variant}>
            {t(`orderDetail.payment.${order.paymentUiKey}`)}
          </Badge>
        </div>
        <div className="ml-auto">
          <p className={`text-right ${LABEL_CLASS}`}>{t("orderDetail.meta.total")}</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight">{formatPrice(order.totalMinorUnits, order.currencyCode, locale)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const LABEL_CLASS = "text-[11px] tracking-wider text-muted-foreground/50 uppercase"

interface OrderMetaStripProps {
  readonly order: Order["adminOrderDetail"]
}
