import type { Row, RowData } from "@tanstack/react-table";

import {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATOR_SYMBOL,
  DATE_COLUMN_FILTER_OPERATORS,
  isDateColumnFilterOperator,
  isDateColumnFilterValue,
  type DateColumnFilterOperator,
  type DateColumnFilterValue
} from "~/src/lib/_utils/admin-column-filters";
import { isIsoDateString, parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/lib/_utils/iso-date";

export { formatDateToIsoDateLocal, isIsoDateString, parseIsoDateToStartMs } from "~/src/lib/_utils/iso-date";
export {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATOR_SYMBOL,
  DATE_COLUMN_FILTER_OPERATORS,
  isDateColumnFilterOperator,
  isDateColumnFilterValue,
  type DateColumnFilterOperator,
  type DateColumnFilterValue
};

function resolveCellDateMs(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? undefined : ms;
  }

  if (typeof value === "string" || typeof value === "number") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? undefined : ms;
  }

  return undefined;
}

interface FormatDateFilterTriggerLabelInput {
  readonly activeFilter: DateColumnFilterValue | undefined;
  readonly formatIsoDateLabel: (isoDate: string) => string;
  readonly idleLabel: string;
}

export function formatDateFilterTriggerLabel({ activeFilter, formatIsoDateLabel, idleLabel }: FormatDateFilterTriggerLabelInput): string {
  if (activeFilter === undefined) {
    return idleLabel;
  }

  if (
    activeFilter.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN &&
    activeFilter.startDate !== undefined &&
    activeFilter.endDate !== undefined
  ) {
    return `${formatIsoDateLabel(activeFilter.startDate)} – ${formatIsoDateLabel(activeFilter.endDate)}`;
  }

  if (activeFilter.date === undefined) {
    return idleLabel;
  }

  return `${DATE_COLUMN_FILTER_OPERATOR_SYMBOL[activeFilter.operator]} ${formatIsoDateLabel(activeFilter.date)}`;
}

function matchesOperator(cellMs: number, filter: DateColumnFilterValue): boolean {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      if (filter.date === undefined) {
        return true;
      }

      return cellMs >= parseIsoDateToStartMs(filter.date) && cellMs <= parseIsoDateToEndMs(filter.date);
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      if (filter.date === undefined) {
        return true;
      }

      return cellMs < parseIsoDateToStartMs(filter.date);
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      if (filter.date === undefined) {
        return true;
      }

      return cellMs > parseIsoDateToEndMs(filter.date);
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startDate === undefined || filter.endDate === undefined) {
        return true;
      }

      const rangeStart = parseIsoDateToStartMs(filter.startDate);
      const rangeEnd = parseIsoDateToEndMs(filter.endDate);
      return cellMs >= rangeStart && cellMs <= rangeEnd;
    }
    default: {
      return true;
    }
  }
}

export function isDateFilterRangeValid(startDate: string, endDate: string): boolean {
  if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
    return false;
  }

  return parseIsoDateToStartMs(startDate) <= parseIsoDateToStartMs(endDate);
}

export function matchesDateColumnFilter<TData extends RowData>(row: Row<TData>, columnId: string, filterValue: unknown): boolean {
  if (!isDateColumnFilterValue(filterValue)) {
    return true;
  }

  const cellMs = resolveCellDateMs(row.getValue(columnId));
  if (cellMs === undefined) {
    return false;
  }

  return matchesOperator(cellMs, filterValue);
}
