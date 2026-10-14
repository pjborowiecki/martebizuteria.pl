import { type CSSProperties, type JSX, type ReactNode, useMemo } from "react"

import { useLocale } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"

export const AdminChartMoneyTooltipRow = ({
  amount,
  currencyCode,
  label,
  seriesKey,
}: Readonly<AdminChartMoneyTooltipRowProps>): JSX.Element => {
  const locale = useLocale()
  const indicatorStyle = useMemo<CSSProperties>(() => ({ backgroundColor: `var(--color-${seriesKey})` }), [seriesKey])

  return (
    <>
      <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" data-slot="chart-tooltip-indicator" style={indicatorStyle} />
      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">{formatPrice(amount, currencyCode, locale)}</span>
      </div>
    </>
  )
}

interface AdminChartMoneyTooltipRowProps {
  readonly amount: number
  readonly currencyCode: string
  readonly label: ReactNode
  readonly seriesKey: string
}
