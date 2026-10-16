import { type JSX } from "react"

import { Check } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ADMIN_ORDER_FULFILLMENT_LABEL_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { useFormatter } from "~/src/hooks/use-display-format"

export const FulfillmentStepItem = ({ index, step }: Readonly<FulfillmentStepItemProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const format = useFormatter()

  const connectorColor = step.done ? "bg-foreground" : "bg-border"

  return (
    <div className="relative flex h-8 items-center gap-3 sm:h-auto sm:flex-1 sm:flex-col sm:gap-0 sm:text-center">
      {index > 0 && <div className={`absolute bottom-1/2 left-3.5 h-10 w-0.5 -translate-x-1/2 sm:hidden ${connectorColor}`} />}
      <div className="relative flex items-center justify-center sm:w-full">
        {index > 0 && <div className={`absolute right-1/2 h-0.5 w-full max-sm:hidden ${connectorColor}`} />}
        <div
          className={`relative z-10 flex size-7 items-center justify-center rounded-full border-2 ${step.done ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground/30"}`}
        >
          {step.done ? <Check className="size-3.5" strokeWidth={2.5} /> : <span className="size-2 rounded-full bg-current" />}
        </div>
      </div>
      <div className="flex min-w-0 items-baseline gap-2 sm:block">
        <p className={`text-[12px] sm:mt-2 ${step.done ? "font-medium text-foreground" : "text-muted-foreground/50"}`}>
          {t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[step.key])}
        </p>
        {step.at !== undefined && (
          <p className="text-[10px] text-muted-foreground/40">
            {format.dateTime(step.at, { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" })}
          </p>
        )}
      </div>
    </div>
  )
}

interface FulfillmentStepItemProps {
  readonly index: number
  readonly step: Order["adminOrderDetail"]["fulfillmentSteps"][number]
}
