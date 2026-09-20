import { type SQL, and, gte, lte, sql } from "drizzle-orm"
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/lib/admin-column-filters"
import { type DateTimeColumnFilterValue } from "~/src/lib/admin-datetime-filter"
import { parseIsoDateTimeLocalToEndMs, parseIsoDateTimeLocalToMs } from "~/src/lib/iso-datetime"
export const buildAdminDateTimeFilterSql = (column: AnySQLiteColumn, filter: DateTimeColumnFilterValue): SQL => {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }
      const dayStart = new Date(parseIsoDateTimeLocalToMs(filter.date))
      const dayEnd = new Date(parseIsoDateTimeLocalToEndMs(filter.date))
      return and(gte(column, dayStart), lte(column, dayEnd))!
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }
      return sql`${column} < ${new Date(parseIsoDateTimeLocalToMs(filter.date))}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }
      return sql`${column} > ${new Date(parseIsoDateTimeLocalToEndMs(filter.date))}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startDate === undefined || filter.endDate === undefined) {
        return sql`1 = 1`
      }
      const rangeStart = new Date(parseIsoDateTimeLocalToMs(filter.startDate))
      const rangeEnd = new Date(parseIsoDateTimeLocalToEndMs(filter.endDate))
      return and(gte(column, rangeStart), lte(column, rangeEnd))!
    }
    default: {
      return sql`1 = 1`
    }
  }
}
