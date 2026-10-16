import { useCallback, useEffect, useMemo, useState } from "react"

import { useTranslations } from "use-intl/react"

import { DATE_COLUMN_FILTER_OPERATOR, isDateColumnFilterOperator } from "~/src/modules/_core/utils/column-filters"
import { instantOfWallClock } from "~/src/modules/_core/utils/datetime"
import {
  type DateTimeColumnFilterValue,
  type DateTimeFilterDraft,
  dateTimeFilterDraftFromValue,
  dateTimeFilterValueFromDraft,
  emptyDateTimeFilterDraft,
  formatDateTimeFilterTriggerLabel,
  isDateTimeFilterDraftValid,
} from "~/src/modules/_core/utils/datetime-column-filter"
import { defaultDateTimeFilterEndTime, hasIsoDateTimeTimeComponent, parseIsoDateTimeLocal } from "~/src/modules/_core/utils/iso-datetime"

import { useDisplayTimeZone, useFormatter } from "~/src/hooks/use-display-format"

import { useAuditLogToday } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-log-today"
import {
  buildAuditDateTimeFilterLabels,
  buildAuditDateTimeFilterOperatorOptions,
} from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-datetime-filter-labels"

export const useAuditDateTimeLabel = (): ((isoDateTime: string) => string) => {
  const format = useFormatter()
  const timeZone = useDisplayTimeZone()

  return useCallback(
    (isoDateTime: string): string =>
      format.dateTime(
        instantOfWallClock(parseIsoDateTimeLocal(isoDateTime), timeZone),
        hasIsoDateTimeTimeComponent(isoDateTime) ? DATE_TIME_LABEL_FORMAT : DATE_LABEL_FORMAT,
      ),
    [format, timeZone],
  )
}

export const useAuditDateTimeFilter = ({ activeDateFilter, applyAuditFilter }: UseAuditDateTimeFilterInput) => {
  const t = useTranslations("pages.admin")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateTimeFilterDraft>(() => dateTimeFilterDraftFromValue(activeDateFilter))
  const todayIso = useAuditLogToday()
  useEffect(() => {
    if (open) {
      setDraft(dateTimeFilterDraftFromValue(activeDateFilter))
    }
  }, [activeDateFilter, open])

  const { labels, operatorOptions } = useMemo(() => {
    const nextLabels = buildAuditDateTimeFilterLabels(t)

    return {
      labels: nextLabels,
      operatorOptions: buildAuditDateTimeFilterOperatorOptions(nextLabels),
    }
  }, [t])

  const formatIsoDateTimeLabel = useAuditDateTimeLabel()

  const triggerLabel = formatDateTimeFilterTriggerLabel({
    activeFilter: activeDateFilter,
    formatIsoDateTimeLabel,
    idleLabel: t("audit.filter.dateRange"),
  })

  const handleOpenChange = setOpen
  const handleOperatorChange = useCallback((value: string | null) => {
    if (value === null || !isDateColumnFilterOperator(value)) {
      return
    }
    setDraft((current) => {
      if (value === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
        return {
          ...current,
          endTime: current.endTime === "" ? defaultDateTimeFilterEndTime() : current.endTime,
          operator: value,
          startTime: current.startTime === "" ? DEFAULT_START_TIME : current.startTime,
        }
      }

      return {
        ...current,
        operator: value,
        time: current.time === "" ? DEFAULT_START_TIME : current.time,
      }
    })
  }, [])

  const handleDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({
      ...current,
      date: isoDate,
      time: current.time === "" ? DEFAULT_START_TIME : current.time,
    }))
  }, [])

  const handleTimeChange = useCallback((time: string) => {
    setDraft((current) => ({
      ...current,
      time,
    }))
  }, [])

  const handleStartDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({
      ...current,
      startDate: isoDate,
      startTime: current.startTime === "" ? DEFAULT_START_TIME : current.startTime,
    }))
  }, [])

  const handleStartTimeChange = useCallback((time: string) => {
    setDraft((current) => ({
      ...current,
      startTime: time,
    }))
  }, [])

  const handleEndDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({
      ...current,
      endDate: isoDate,
      endTime: current.endTime === "" ? defaultDateTimeFilterEndTime() : current.endTime,
    }))
  }, [])

  const handleEndTimeChange = useCallback((time: string) => {
    setDraft((current) => ({
      ...current,
      endTime: time,
    }))
  }, [])

  const handleApply = useCallback(() => {
    if (!isDateTimeFilterDraftValid(draft)) {
      return
    }
    applyAuditFilter({
      createdAt: dateTimeFilterValueFromDraft(draft),
    })
    setOpen(false)
  }, [applyAuditFilter, draft])

  const handleClear = useCallback(() => {
    applyAuditFilter({
      createdAt: undefined,
    })
    setDraft(emptyDateTimeFilterDraft())
    setOpen(false)
  }, [applyAuditFilter])

  return {
    activeDateFilter,
    draft,
    handleApply,
    handleClear,
    handleDateChange,
    handleEndDateChange,
    handleEndTimeChange,
    handleOpenChange,
    handleOperatorChange,
    handleStartDateChange,
    handleStartTimeChange,
    handleTimeChange,
    isDraftValid: isDateTimeFilterDraftValid(draft),
    labels,
    open,
    operatorOptions,
    todayIso,
    triggerLabel,
  }
}

const DEFAULT_START_TIME = "00:00"

const DATE_LABEL_FORMAT = { dateStyle: "medium" } as const

const DATE_TIME_LABEL_FORMAT = { ...DATE_LABEL_FORMAT, timeStyle: "short" } as const

interface UseAuditDateTimeFilterInput {
  readonly activeDateFilter: DateTimeColumnFilterValue | undefined
  readonly applyAuditFilter: (patch: { readonly createdAt?: DateTimeColumnFilterValue | undefined }) => void
}
