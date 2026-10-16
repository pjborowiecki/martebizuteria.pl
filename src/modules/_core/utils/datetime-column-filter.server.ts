import { type SQL, and, sql } from "drizzle-orm"
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { type DateTimeColumnFilterValue, wallClockEndMs, wallClockStartMs } from "~/src/modules/_core/utils/datetime-column-filter"
import { splitIsoDateTimeLocal } from "~/src/modules/_core/utils/iso-datetime"

export const buildAdminDateTimeFilterSql = (column: AnySQLiteColumn | SQL, filter: DateTimeColumnFilterValue, timeZone: string): SQL => {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      const { date } = splitIsoDateTimeLocal(filter.date)

      return and(sql`${column} >= ${wallClockStartMs(date, timeZone)}`, sql`${column} < ${wallClockEndMs(date, timeZone)}`)!
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      return sql`${column} < ${wallClockStartMs(filter.date, timeZone)}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      return sql`${column} >= ${wallClockEndMs(filter.date, timeZone)}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startDate === undefined || filter.endDate === undefined) {
        return sql`1 = 1`
      }

      return and(
        sql`${column} >= ${wallClockStartMs(filter.startDate, timeZone)}`,
        sql`${column} < ${wallClockEndMs(filter.endDate, timeZone)}`,
      )!
    }
    default: {
      return sql`1 = 1`
    }
  }
}
