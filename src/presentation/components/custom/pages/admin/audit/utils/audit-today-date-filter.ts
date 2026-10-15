import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { splitIsoDateTimeLocal } from "~/src/modules/_core/utils/iso-datetime"
import { buildAuditLogDayFilter, resolveAuditLogToday } from "~/src/modules/audit-log/audit-log.utils"

export const buildAuditTodayCreatedAtFilter = (referenceDate: Date = new Date()): DateTimeColumnFilterValue =>
  buildAuditLogDayFilter(resolveAuditLogToday(referenceDate))

const resolveCreatedAtFilterDatePart = (filterDate: string): string => splitIsoDateTimeLocal(filterDate).date

export const isAuditTodayCreatedAtFilter = (filter: DateTimeColumnFilterValue | undefined, referenceDate: Date = new Date()): boolean => {
  if (filter === undefined || filter.operator !== DATE_COLUMN_FILTER_OPERATOR.ON || filter.date === undefined) {
    return false
  }

  return resolveCreatedAtFilterDatePart(filter.date) === resolveAuditLogToday(referenceDate)
}
