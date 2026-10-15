import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DashboardChartCustomRangeFilter } from "~/src/presentation/components/custom/pages/admin/dashboard/components/dashboard-chart-custom-range-filter"
import { type DashboardChartRange } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"

const presetClassName = (isSelected: boolean): string => cn("h-7 px-3 text-xs", !isSelected && "text-muted-foreground")

export const DashboardChartRangeControls = ({
  chartRange,
  customRange,
  onApplyCustomRange,
  onClearCustomRange,
  onSelectRange,
}: Readonly<DashboardChartRangeControlsProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const handleSelect7d = useCallback(() => {
    onSelectRange("7d")
  }, [onSelectRange])

  const handleSelect30d = useCallback(() => {
    onSelectRange("30d")
  }, [onSelectRange])

  const handleSelect1y = useCallback(() => {
    onSelectRange("1y")
  }, [onSelectRange])

  return (
    <div className="grid max-w-full grid-cols-2 items-center gap-0.5 self-start rounded-lg border border-border/50 p-0.5 max-sm:w-full sm:flex sm:flex-wrap sm:justify-end lg:self-auto">
      <Button
        variant={chartRange === "7d" ? "secondary" : "ghost"}
        size="sm"
        className={presetClassName(chartRange === "7d")}
        type="button"
        onClick={handleSelect7d}
      >
        {t("dashboard.chart.last7")}
      </Button>
      <Button
        variant={chartRange === "30d" ? "secondary" : "ghost"}
        size="sm"
        className={presetClassName(chartRange === "30d")}
        type="button"
        onClick={handleSelect30d}
      >
        {t("dashboard.chart.last30")}
      </Button>
      <Button
        variant={chartRange === "1y" ? "secondary" : "ghost"}
        size="sm"
        className={presetClassName(chartRange === "1y")}
        type="button"
        onClick={handleSelect1y}
      >
        {t("dashboard.chart.lastYear")}
      </Button>
      <DashboardChartCustomRangeFilter
        activeRange={customRange}
        isActive={chartRange === "custom"}
        onApply={onApplyCustomRange}
        onClear={onClearCustomRange}
      />
    </div>
  )
}

interface DashboardChartRangeControlsProps {
  readonly chartRange: DashboardChartRange
  readonly customRange:
    | {
        readonly endDate: string
        readonly startDate: string
      }
    | undefined
  readonly onApplyCustomRange: (range: { readonly endDate: string; readonly startDate: string }) => void
  readonly onClearCustomRange: () => void
  readonly onSelectRange: (range: Exclude<DashboardChartRange, "custom">) => void
}
