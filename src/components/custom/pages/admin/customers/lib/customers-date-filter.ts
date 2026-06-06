import type { Row } from "@tanstack/react-table";

import {
  formatDateFilterTriggerLabel,
  isDateFilterRangeValid,
  matchesDateColumnFilter as matchesAdminDateColumnFilter
} from "~/src/lib/_utils/admin-date-filter";

import type { User } from "~/src/modules/user/user.types";

export {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATOR_SYMBOL,
  DATE_COLUMN_FILTER_OPERATORS,
  formatDateToIsoDateLocal,
  isDateColumnFilterOperator,
  isDateColumnFilterValue,
  isIsoDateString,
  parseIsoDateToStartMs,
  type DateColumnFilterOperator,
  type DateColumnFilterValue
} from "~/src/lib/_utils/admin-date-filter";

export { formatDateFilterTriggerLabel, isDateFilterRangeValid };

type AdminCustomerRow = User["adminCustomerListItem"];

export function matchesDateColumnFilter(row: Row<AdminCustomerRow>, columnId: string, filterValue: unknown): boolean {
  return matchesAdminDateColumnFilter(row, columnId, filterValue);
}
