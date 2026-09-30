import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { formatDateToIsoDateLocal } from "~/src/modules/_core/utils/iso-date"
import { splitIsoDateTimeLocal } from "~/src/modules/_core/utils/iso-datetime"

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
