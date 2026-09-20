import { type JSX, useCallback } from "react"

import { useTranslations } from "use-intl"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DashboardChartCustomRangeFilter } from "~/src/presentation/components/custom/pages/admin/dashboard/components/dashboard-chart-custom-range-filter"
import { type DashboardChartRange } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"
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
    <div className="flex max-w-full flex-wrap items-center justify-end gap-0.5 rounded-lg border border-border/50 p-0.5">
      <Button
        variant={chartRange === "7d" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs"
        type="button"
        onClick={handleSelect7d}
      >
        {t("dashboard.chart.last7")}
      </Button>
      <Button
        variant={chartRange === "30d" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs text-muted-foreground"
        type="button"
        onClick={handleSelect30d}
      >
        {t("dashboard.chart.last30")}
      </Button>
      <Button
        variant={chartRange === "1y" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs text-muted-foreground"
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
