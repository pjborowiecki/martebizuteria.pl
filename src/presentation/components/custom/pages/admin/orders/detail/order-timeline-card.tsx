import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"
import { OrderTimelineEvent } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-event"

export const OrderTimelineCard = ({ timeline }: Readonly<OrderTimelineCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium">{t("orderDetail.timeline.title")}</p>
        {timeline.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("orderDetail.timeline.empty")}</p>
        ) : (
          <div className="space-y-0">
            {timeline.map((event) => (
              <OrderTimelineEvent event={event} key={event.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OrderTimelineCardProps {
  readonly timeline: Order["adminOrderDetail"]["timeline"]
}
