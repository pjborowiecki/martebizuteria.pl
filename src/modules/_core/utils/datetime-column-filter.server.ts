import { type SQL, and, sql } from "drizzle-orm"
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { parseIsoDateTimeLocalToEndMs, parseIsoDateTimeLocalToMs } from "~/src/modules/_core/utils/iso-datetime"

export const buildAdminDateTimeFilterSql = (column: AnySQLiteColumn, filter: DateTimeColumnFilterValue): SQL => {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      const dayStart = parseIsoDateTimeLocalToMs(filter.date)
      const dayEnd = parseIsoDateTimeLocalToEndMs(filter.date)

      return and(sql`${column} >= ${dayStart}`, sql`${column} <= ${dayEnd}`)!
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      return sql`${column} < ${parseIsoDateTimeLocalToMs(filter.date)}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      return sql`${column} > ${parseIsoDateTimeLocalToEndMs(filter.date)}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startDate === undefined || filter.endDate === undefined) {
        return sql`1 = 1`
      }

      const rangeStart = parseIsoDateTimeLocalToMs(filter.startDate)
      const rangeEnd = parseIsoDateTimeLocalToEndMs(filter.endDate)

      return and(sql`${column} >= ${rangeStart}`, sql`${column} <= ${rangeEnd}`)!
    }
    default: {
      return sql`1 = 1`
    }
  }
}
