import { type SQL, and, gte, lte, sql } from "drizzle-orm"

import {
  DATE_COLUMN_FILTER_OPERATOR,
  type DateColumnFilterValue,
  NUMERIC_COLUMN_FILTER_OPERATOR,
  type NumericColumnFilterValue,
} from "~/src/lib/admin-column-filters"
import { parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/lib/iso-date"
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
export const buildAdminDateFilterSql = (column: SQL, filter: DateColumnFilterValue): SQL => {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }
      const dayStart = new Date(parseIsoDateToStartMs(filter.date))
      const dayEnd = new Date(parseIsoDateToEndMs(filter.date))
      return and(gte(column, dayStart), lte(column, dayEnd))!
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }
      return sql`${column} < ${new Date(parseIsoDateToStartMs(filter.date))}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }
      return sql`${column} > ${new Date(parseIsoDateToEndMs(filter.date))}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startDate === undefined || filter.endDate === undefined) {
        return sql`1 = 1`
      }
      const rangeStart = new Date(parseIsoDateToStartMs(filter.startDate))
      const rangeEnd = new Date(parseIsoDateToEndMs(filter.endDate))
      return and(gte(column, rangeStart), lte(column, rangeEnd))!
    }
    default: {
      return sql`1 = 1`
    }
  }
}
