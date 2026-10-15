import { type SQL, and, gte, lte, sql } from "drizzle-orm"

import { NUMERIC_COLUMN_FILTER_OPERATOR, type NumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"

export const buildAdminNumericFilterSql = (column: SQL, filter: NumericColumnFilterValue): SQL => {
  switch (filter.operator) {
    case NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startAmountMinorUnits === undefined || filter.endAmountMinorUnits === undefined) {
        return sql`1 = 1`
      }

      const startAmount = Math.min(filter.startAmountMinorUnits, filter.endAmountMinorUnits)
      const endAmount = Math.max(filter.startAmountMinorUnits, filter.endAmountMinorUnits)

      return and(gte(column, startAmount), lte(column, endAmount))!
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.EQ: {
      return sql`${column} = ${filter.amountMinorUnits}`
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.GT: {
      return sql`${column} > ${filter.amountMinorUnits}`
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.GTE: {
      return sql`${column} >= ${filter.amountMinorUnits}`
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.LT: {
      return sql`${column} < ${filter.amountMinorUnits}`
    }
    case NUMERIC_COLUMN_FILTER_OPERATOR.LTE: {
      return sql`${column} <= ${filter.amountMinorUnits}`
    }
    default: {
      return sql`1 = 1`
    }
  }
}
