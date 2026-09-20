import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { DEMO_TIMELINE, TIMELINE_KEY_SLICE_LENGTH } from "~/src/data/order-detail-data"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { OrderTimelineEvent } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-event"
export const OrderTimelineCard = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium">{t("orderDetail.timeline.title")}</p>
        <div className="space-y-0">
          {DEMO_TIMELINE.map((event) => (
            <OrderTimelineEvent
              event={event}
              key={`${event.date}-${event.type}-${event.description.slice(0, TIMELINE_KEY_SLICE_LENGTH)}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
