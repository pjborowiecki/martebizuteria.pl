import { type Row, type RowData, type TableFeatures } from "@tanstack/react-table"

import {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATOR_SYMBOL,
  type DateColumnFilterValue,
  type ValidatedDateColumnFilterValue,
  isDateColumnFilterValue,
} from "~/src/modules/_core/utils/column-filters"
import { isIsoDateString, parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/modules/_core/utils/iso-date"

const resolveCellDateMs = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (value instanceof Date) {
    const ms = value.getTime()

    return Number.isNaN(ms) ? undefined : ms
  }

  if (typeof value === "string" || typeof value === "number") {
    const ms = new Date(value).getTime()

    return Number.isNaN(ms) ? undefined : ms
  }

  return undefined
}

export const formatDateFilterTriggerLabel = ({
  activeFilter,
  formatIsoDateLabel,
  idleLabel,
}: FormatDateFilterTriggerLabelInput): string => {
  if (activeFilter === undefined) {
    return idleLabel
  }

  if (
    activeFilter.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN &&
    activeFilter.startDate !== undefined &&
    activeFilter.endDate !== undefined
  ) {
    return `${formatIsoDateLabel(activeFilter.startDate)} – ${formatIsoDateLabel(activeFilter.endDate)}`
  }

  if (activeFilter.date === undefined) {
    return idleLabel
  }

  return `${DATE_COLUMN_FILTER_OPERATOR_SYMBOL[activeFilter.operator]} ${formatIsoDateLabel(activeFilter.date)}`
}

const matchesOperator = (cellMs: number, filter: ValidatedDateColumnFilterValue): boolean => {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      return cellMs >= parseIsoDateToStartMs(filter.date) && cellMs <= parseIsoDateToEndMs(filter.date)
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      return cellMs < parseIsoDateToStartMs(filter.date)
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      return cellMs > parseIsoDateToEndMs(filter.date)
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      const rangeStart = parseIsoDateToStartMs(filter.startDate)
      const rangeEnd = parseIsoDateToEndMs(filter.endDate)

      return cellMs >= rangeStart && cellMs <= rangeEnd
    }
  }
}

export const isDateFilterRangeValid = (startDate: string, endDate: string): boolean => {
  if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
    return false
  }

  return parseIsoDateToStartMs(startDate) <= parseIsoDateToStartMs(endDate)
}

export const matchesDateColumnFilter = <TFeatures extends TableFeatures, TData extends RowData>(
  row: Row<TFeatures, TData>,
  columnId: string,
  filterValue: unknown,
): boolean => {
  if (!isDateColumnFilterValue(filterValue)) {
    return true
  }

  const cellMs = resolveCellDateMs(row.getValue(columnId))
  if (cellMs === undefined) {
    return false
  }

  return matchesOperator(cellMs, filterValue)
}

interface FormatDateFilterTriggerLabelInput {
  readonly activeFilter: DateColumnFilterValue | undefined
  readonly formatIsoDateLabel: (isoDate: string) => string
  readonly idleLabel: string
}
