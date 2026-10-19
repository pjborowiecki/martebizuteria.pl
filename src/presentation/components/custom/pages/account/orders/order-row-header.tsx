import { type JSX } from "react"

import { cn } from "cn"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { type Order } from "~/src/modules/order/order.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

import { Image } from "~/src/presentation/components/custom/image"

const MAX_VISIBLE_IMAGES = 3

const MAX_PHONE_TILES = 2

const NO_HIDDEN_ITEMS = 0

const OVERLAP_STYLE = {
  marginLeft: "-0.5rem",
}

export const OrderRowHeader = ({
  detailsId,
  expanded,
  order,
  toggleExpanded,
}: Readonly<{
  detailsId: string
  expanded: boolean
  order: Order["customerOrderSummary"]
  toggleExpanded: () => void
}>): JSX.Element => {
  const t = useTranslations("pages.account.orders")
  const format = useFormatter()
  const totalLabel = format.number(centsToDisplayAmount(order.totalMinorUnits), {
    currency: order.currencyCode,
    style: "currency",
  })

  const dateLabel = format.dateTime(order.createdAt, {
    dateStyle: "medium",
  })

  const hiddenItemCount = order.items.length - MAX_VISIBLE_IMAGES
  const phoneCountsAllButFirst = order.items.length > MAX_PHONE_TILES

  return (
    <button
      aria-controls={detailsId}
      aria-expanded={expanded}
      className="group flex w-full cursor-pointer items-center gap-4 py-5 text-left transition-colors sm:gap-5"
      onClick={toggleExpanded}
      type="button"
    >
      <div className="flex items-center gap-3">
        {order.items.slice(0, MAX_VISIBLE_IMAGES).map((item, index) => (
          <div
            className={cn(
              "relative size-12 shrink-0 overflow-hidden bg-muted sm:size-14",
              index > 0 && phoneCountsAllButFirst && "max-sm:hidden",
            )}
            key={item.id}
            style={index > 0 ? OVERLAP_STYLE : undefined}
          >
            <Image
              alt={item.name}
              className="absolute inset-0 size-full object-cover"
              height={56}
              src={item.image ?? PLACEHOLDER_IMAGE}
              width={56}
            />
          </div>
        ))}
        {phoneCountsAllButFirst && (
          <span
            className="relative flex size-12 shrink-0 items-center justify-center bg-muted text-[12px] tabular-nums sm:hidden"
            style={OVERLAP_STYLE}
          >
            {t("moreItems", { count: order.items.length - 1 })}
          </span>
        )}
        {hiddenItemCount > NO_HIDDEN_ITEMS && (
          <span
            className="relative flex size-14 shrink-0 items-center justify-center bg-muted text-[12px] tabular-nums max-sm:hidden"
            style={OVERLAP_STYLE}
          >
            {t("moreItems", { count: hiddenItemCount })}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] tracking-[0.02em] whitespace-nowrap">{order.orderNumber}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{dateLabel}</p>
        <p className="mt-1 text-[12px] tabular-nums sm:hidden">
          {totalLabel} <span className="whitespace-nowrap text-muted-foreground">· {t(`status.${order.filterStatus}`)}</span>
        </p>
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-[13px] tracking-[0.02em] tabular-nums">{totalLabel}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t(`status.${order.filterStatus}`)}</p>
      </div>

      <ChevronDown
        className={`size-4 shrink-0 text-muted-foreground/50 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        strokeWidth={1.5}
      />
    </button>
  )
}
