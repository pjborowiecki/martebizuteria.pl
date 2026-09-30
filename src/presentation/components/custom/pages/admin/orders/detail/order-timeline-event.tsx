import { type JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import {
  ORDER_EMAIL_STATUS_CONFIG,
  ORDER_TIMELINE_ICONS,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderTimelineEvent = ({ event }: Readonly<OrderTimelineEventProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const Icon = ORDER_TIMELINE_ICONS[event.kind]
  const emailStatus = event.emailStatus === undefined ? undefined : ORDER_EMAIL_STATUS_CONFIG[event.emailStatus]

  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      <div className="absolute top-6 left-[11px] h-[calc(100%-16px)] w-px bg-border/50 last:hidden" />
      <div className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
        {emailStatus !== undefined && (
          <emailStatus.icon className={`absolute -right-0.5 -bottom-0.5 size-3 ${emailStatus.className}`} strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[13px] leading-snug">{t(`orderDetail.timeline.actions.${event.labelKey}`)}</p>
        {event.detail !== undefined && <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{event.detail}</p>}
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/50">
            {format.dateTime(event.at, { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short", year: "numeric" })}
          </span>
          <span className="text-[11px] text-muted-foreground/40">{event.actorName}</span>
          {emailStatus !== undefined && event.emailStatus !== undefined && (
            <span className={`text-[10px] font-medium ${emailStatus.className}`}>
              {t(`orderDetail.timeline.emailStatus.${event.emailStatus}`)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface OrderTimelineEventProps {
  readonly event: Order["adminOrderDetailTimelineEvent"]
}
