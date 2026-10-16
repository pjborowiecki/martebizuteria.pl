import { type JSX, useCallback, useEffect, useMemo, useState } from "react"

import { useTranslations } from "use-intl/react"

import { formatCalendarDateToIsoDate, toCalendarDate } from "~/src/modules/_core/utils/datetime"
import { ISO_DATE_TIME_ZONE, parseIsoDateToUtcDate } from "~/src/modules/_core/utils/iso-date"

import { useDisplayTimeZone, useFormatter } from "~/src/hooks/use-display-format"

import { Button } from "~/src/presentation/components/shadcn/button"
import { LocaleDatePicker } from "~/src/presentation/components/shadcn/locale-date-picker"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "~/src/presentation/components/shadcn/popover"

import { isDateFilterRangeValid } from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { type DashboardCustomChartRange } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"

export const DashboardChartCustomRangeFilter = ({
  activeRange,
  isActive,
  onApply,
  onClear,
}: Readonly<DashboardChartCustomRangeFilterProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const timeZone = useDisplayTimeZone()
  const todayIso = formatCalendarDateToIsoDate(toCalendarDate(new Date(), timeZone))
  useEffect(() => {
    if (open) {
      setStartDate(activeRange?.startDate ?? "")
      setEndDate(activeRange?.endDate ?? "")
    }
  }, [activeRange, open])

  const triggerLabel = useMemo(() => {
    if (activeRange === undefined) {
      return t("dashboard.chart.custom")
    }

    const startLabel = format.dateTime(parseIsoDateToUtcDate(activeRange.startDate), {
      dateStyle: "medium",
      timeZone: ISO_DATE_TIME_ZONE,
    })

    const endLabel = format.dateTime(parseIsoDateToUtcDate(activeRange.endDate), {
      dateStyle: "medium",
      timeZone: ISO_DATE_TIME_ZONE,
    })

    return `${startLabel} – ${endLabel}`
  }, [activeRange, format, t])

  const isDraftValid = isDateFilterRangeValid(startDate, endDate)
  const handleApply = useCallback(() => {
    onApply({
      endDate,
      startDate,
    })
    setOpen(false)
  }, [endDate, onApply, startDate])

  const handleClear = useCallback(() => {
    onClear()
    setOpen(false)
  }, [onClear])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={
          isActive
            ? "inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium whitespace-nowrap"
            : "inline-flex h-7 shrink-0 items-center justify-center rounded-md px-3 text-xs font-medium whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground"
        }
        type="button"
      >
        <span className="max-w-[9rem] truncate">{isActive && activeRange !== undefined ? triggerLabel : t("dashboard.chart.custom")}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{t("dashboard.chart.customRange")}</PopoverTitle>
        </PopoverHeader>

        <div className="grid gap-3">
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">{t("dashboard.chart.startDate")}</p>
            <LocaleDatePicker
              ariaLabel={t("dashboard.chart.startDate")}
              clearLabel={t("dashboard.chart.clearDate")}
              max={endDate === "" ? todayIso : endDate}
              onChange={setStartDate}
              placeholder={t("dashboard.chart.placeholder")}
              todayIso={todayIso}
              todayLabel={t("dashboard.chart.today")}
              value={startDate}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">{t("dashboard.chart.endDate")}</p>
            <LocaleDatePicker
              ariaLabel={t("dashboard.chart.endDate")}
              clearLabel={t("dashboard.chart.clearDate")}
              max={todayIso}
              min={startDate === "" ? undefined : startDate}
              onChange={setEndDate}
              placeholder={t("dashboard.chart.placeholder")}
              todayIso={todayIso}
              todayLabel={t("dashboard.chart.today")}
              value={endDate}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          {activeRange !== undefined && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              {t("dashboard.chart.clear")}
            </Button>
          )}
          <Button type="button" size="sm" disabled={!isDraftValid} onClick={handleApply}>
            {t("dashboard.chart.apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface DashboardChartCustomRangeFilterProps {
  readonly activeRange: DashboardCustomChartRange | undefined
  readonly isActive: boolean
  readonly onApply: (range: DashboardCustomChartRange) => void
  readonly onClear: () => void
}
