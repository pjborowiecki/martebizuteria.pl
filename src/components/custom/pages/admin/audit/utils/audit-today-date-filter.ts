import { DATE_COLUMN_FILTER_OPERATOR, type DateTimeColumnFilterValue } from "~/src/lib/_utils/admin-datetime-filter";
import { formatDateToIsoDateLocal } from "~/src/lib/_utils/iso-date";
import { splitIsoDateTimeLocal } from "~/src/lib/_utils/iso-datetime";

/** Date-only ON filter — `T00:00` would cap the upper bound to 00:00:59, not end-of-day. */
export function buildAuditTodayCreatedAtFilter(referenceDate: Date = new Date()): DateTimeColumnFilterValue {
  return {
    date: formatDateToIsoDateLocal(referenceDate),
    operator: DATE_COLUMN_FILTER_OPERATOR.ON
  };
}

function resolveCreatedAtFilterDatePart(filterDate: string): string {
  return splitIsoDateTimeLocal(filterDate).date;
}

export function isAuditTodayCreatedAtFilter(filter: DateTimeColumnFilterValue | undefined, referenceDate: Date = new Date()): boolean {
  if (filter === undefined || filter.operator !== DATE_COLUMN_FILTER_OPERATOR.ON || filter.date === undefined) {
    return false;
  }

  const todayIso = formatDateToIsoDateLocal(referenceDate);
  return resolveCreatedAtFilterDatePart(filter.date) === todayIso;
}
