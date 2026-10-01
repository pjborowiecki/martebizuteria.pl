import { type JSX } from "react"

import { useFormatter, useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { Separator } from "~/src/presentation/components/shadcn/separator"

export const TimelineBlock = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()

  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("timeline")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-3">
        {order.timeline.map((entry, index) => (
          <div className="flex items-start gap-3" key={`${entry.event}-${entry.date.toISOString()}`}>
            <div className="flex flex-col items-center">
              <div className={`mt-1 size-1.5 rounded-full ${index === 0 ? "bg-foreground" : "bg-muted-foreground/30"}`} />
              {index < order.timeline.length - 1 ? <div className="mt-1 h-4 w-px bg-border" /> : undefined}
            </div>
            <div className="min-w-0">
              <p className="text-[12px]">{t(`events.${entry.event}`)}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {format.dateTime(entry.date, {
                  dateStyle: "medium",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
