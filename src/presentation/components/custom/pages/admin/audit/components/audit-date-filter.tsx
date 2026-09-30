import { type JSX } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "~/src/presentation/components/shadcn/popover"

import { useAuditDataGridContext } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid"
import { useAuditDateTimeFilter } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-datetime-filter"
import { adminColumnFilterTriggerClass } from "~/src/presentation/components/custom/pages/admin/lib/admin-column-filter-trigger"
import { AdminDateTimeFilterForm } from "~/src/presentation/components/custom/pages/admin/lib/admin-datetime-filter-form"

export const AuditDateFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { activeDateFilter, applyAuditFilter } = useAuditDataGridContext()
  const filter = useAuditDateTimeFilter({
    activeDateFilter,
    applyAuditFilter,
  })

  return (
    <Popover open={filter.open} onOpenChange={filter.handleOpenChange}>
      <PopoverTrigger
        aria-label={t("audit.filter.dateRange")}
        className={adminColumnFilterTriggerClass(filter.activeDateFilter !== undefined)}
      >
        <ListFilter className="size-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
        <span className="truncate">{filter.triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{t("audit.filter.dateRange")}</PopoverTitle>
        </PopoverHeader>

        <AdminDateTimeFilterForm
          draft={filter.draft}
          labels={filter.labels}
          onDateChange={filter.handleDateChange}
          onEndDateChange={filter.handleEndDateChange}
          onEndTimeChange={filter.handleEndTimeChange}
          onOperatorChange={filter.handleOperatorChange}
          onStartDateChange={filter.handleStartDateChange}
          onStartTimeChange={filter.handleStartTimeChange}
          onTimeChange={filter.handleTimeChange}
          operatorOptions={filter.operatorOptions}
          todayIso={filter.todayIso}
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          {filter.activeDateFilter !== undefined && (
            <Button type="button" variant="ghost" size="sm" onClick={filter.handleClear}>
              {filter.labels.clear}
            </Button>
          )}
          <Button type="button" size="sm" disabled={!filter.isDraftValid} onClick={filter.handleApply}>
            {filter.labels.apply}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
