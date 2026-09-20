import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/lib/admin-column-filters"
import { type DateTimeColumnFilterValue } from "~/src/lib/admin-datetime-filter"
import { formatDateToIsoDateLocal } from "~/src/lib/iso-date"
import { splitIsoDateTimeLocal } from "~/src/lib/iso-datetime"

/** Date-only ON filter — `T00:00` would cap the upper bound to 00:00:59, not end-of-day. */
export const buildAuditTodayCreatedAtFilter = (referenceDate: Date = new Date()): DateTimeColumnFilterValue => ({
  date: formatDateToIsoDateLocal(referenceDate),
  operator: DATE_COLUMN_FILTER_OPERATOR.ON,
})
const resolveCreatedAtFilterDatePart = (filterDate: string): string => splitIsoDateTimeLocal(filterDate).date

export const isAuditTodayCreatedAtFilter = (filter: DateTimeColumnFilterValue | undefined, referenceDate: Date = new Date()): boolean => {
  if (filter === undefined || filter.operator !== DATE_COLUMN_FILTER_OPERATOR.ON || filter.date === undefined) {
    return false
  }
  const todayIso = formatDateToIsoDateLocal(referenceDate)
  return resolveCreatedAtFilterDatePart(filter.date) === todayIso
}
