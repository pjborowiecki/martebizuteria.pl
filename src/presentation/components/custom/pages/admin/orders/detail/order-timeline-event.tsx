import { type JSX } from "react"

import { Clock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { EMAIL_STATUS_CONFIG, TIMELINE_ICONS, TIMELINE_KEY_SLICE_LENGTH, type TimelineEvent } from "~/src/data/order-detail"

export const OrderTimelineEvent = ({ event }: OrderTimelineEventProps): JSX.Element => {
  const t = useTranslations("pages.admin")
  const Icon = TIMELINE_ICONS[event.type] ?? Clock
  const emailStatus = event.type === "email" && event.status !== undefined ? EMAIL_STATUS_CONFIG[event.status] : undefined
  const eventKey = `${event.date}-${event.type}-${event.description.slice(0, TIMELINE_KEY_SLICE_LENGTH)}`

  return (
    <div className="relative flex gap-3 pb-5 last:pb-0" key={eventKey}>
      <div className="absolute top-6 left-[11px] h-[calc(100%-16px)] w-px bg-border/50 last:hidden" />
      <div className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
        {emailStatus !== undefined && (
          <emailStatus.icon className={`absolute -right-0.5 -bottom-0.5 size-3 ${emailStatus.className}`} strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[13px] leading-snug">{event.description}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/50">{event.date}</span>
          {emailStatus !== undefined && event.status !== undefined && (
            <span className={`text-[10px] font-medium ${emailStatus.className}`}>
              {t(`orderDetail.timeline.emailStatus.${event.status}`)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface OrderTimelineEventProps {
  readonly event: TimelineEvent
}
