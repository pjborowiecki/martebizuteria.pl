import { type Row, type RowData, type TableFeatures } from "@tanstack/react-table"

import {
  NUMERIC_COLUMN_FILTER_OPERATOR,
  type ValidatedNumericColumnFilterValue,
  isNumericColumnFilterValue,
} from "~/src/modules/_core/utils/column-filters"

const matchesOperator = (cellMinorUnits: number, filter: ValidatedNumericColumnFilterValue): boolean => {
  switch (filter.operator) {
    case NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN: {
      const startAmount = Math.min(filter.startAmountMinorUnits, filter.endAmountMinorUnits)
      const endAmount = Math.max(filter.startAmountMinorUnits, filter.endAmountMinorUnits)

      return cellMinorUnits >= startAmount && cellMinorUnits <= endAmount
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.EQ: {
      return cellMinorUnits === filter.amountMinorUnits
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.GT: {
      return cellMinorUnits > filter.amountMinorUnits
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.GTE: {
      return cellMinorUnits >= filter.amountMinorUnits
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.LT: {
      return cellMinorUnits < filter.amountMinorUnits
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.LTE: {
      return cellMinorUnits <= filter.amountMinorUnits
    }
    default: {
      return true
    }
  }
}

export const matchesNumericColumnFilter = <TFeatures extends TableFeatures, TData extends RowData>(
  row: Row<TFeatures, TData>,
  columnId: string,
  filterValue: unknown,
): boolean => {
  if (!isNumericColumnFilterValue(filterValue)) {
    return true
  }

  const cellValue = row.getValue(columnId)
  if (typeof cellValue !== "number" || !Number.isFinite(cellValue)) {
    return false
  }

  return matchesOperator(cellValue, filterValue)
}
