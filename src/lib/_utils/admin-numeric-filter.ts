import type { Row, RowData } from "@tanstack/react-table";

import {
  isNumericColumnFilterValue,
  NUMERIC_COLUMN_FILTER_OPERATOR,
  type NumericColumnFilterValue
} from "~/src/lib/_utils/admin-column-filters";

function matchesOperator(cellMinorUnits: number, filter: NumericColumnFilterValue): boolean {
  switch (filter.operator) {
    case NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startAmountMinorUnits === undefined || filter.endAmountMinorUnits === undefined) {
        return true;
      }

      const startAmount = Math.min(filter.startAmountMinorUnits, filter.endAmountMinorUnits);
      const endAmount = Math.max(filter.startAmountMinorUnits, filter.endAmountMinorUnits);
      return cellMinorUnits >= startAmount && cellMinorUnits <= endAmount;
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.EQ: {
      return cellMinorUnits === filter.amountMinorUnits;
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.GT: {
      return cellMinorUnits > filter.amountMinorUnits!;
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.GTE: {
      return cellMinorUnits >= filter.amountMinorUnits!;
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.LT: {
      return cellMinorUnits < filter.amountMinorUnits!;
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.LTE: {
      return cellMinorUnits <= filter.amountMinorUnits!;
    }
    default: {
      return true;
    }
  }
}

export function matchesNumericColumnFilter<TData extends RowData>(row: Row<TData>, columnId: string, filterValue: unknown): boolean {
  if (!isNumericColumnFilterValue(filterValue)) {
    return true;
  }

  const cellValue = row.getValue(columnId);
  if (typeof cellValue !== "number" || !Number.isFinite(cellValue)) {
    return false;
  }

  return matchesOperator(cellValue, filterValue);
}
