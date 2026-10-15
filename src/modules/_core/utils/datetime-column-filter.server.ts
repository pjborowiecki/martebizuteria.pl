import { type SQL, and, sql } from "drizzle-orm"
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

import { DEFAULT_TIMEZONE_CODE } from "~/src/modules/_core/constants/timezone"
import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { instantOfWallClock, normalizeCalendarDate, startOfCalendarDate } from "~/src/modules/_core/utils/datetime"
import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { hasIsoDateTimeTimeComponent, parseIsoDateTimeLocal, splitIsoDateTimeLocal } from "~/src/modules/_core/utils/iso-datetime"

const MS_PER_MINUTE = 60_000

const storeWallClockStartMs = (value: string): number => instantOfWallClock(parseIsoDateTimeLocal(value), DEFAULT_TIMEZONE_CODE).getTime()

const storeWallClockEndMs = (value: string): number => {
  if (hasIsoDateTimeTimeComponent(value)) {
    return storeWallClockStartMs(value) + MS_PER_MINUTE
  }

  const { day, month, year } = parseIsoDateTimeLocal(value)

  return startOfCalendarDate(normalizeCalendarDate({ day: day + 1, month, year }), DEFAULT_TIMEZONE_CODE).getTime()
}

export const buildAdminDateTimeFilterSql = (column: AnySQLiteColumn, filter: DateTimeColumnFilterValue): SQL => {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      const { date } = splitIsoDateTimeLocal(filter.date)

      return and(sql`${column} >= ${storeWallClockStartMs(date)}`, sql`${column} < ${storeWallClockEndMs(date)}`)!
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      return sql`${column} < ${storeWallClockStartMs(filter.date)}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      if (filter.date === undefined) {
        return sql`1 = 1`
      }

      return sql`${column} >= ${storeWallClockEndMs(filter.date)}`
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startDate === undefined || filter.endDate === undefined) {
        return sql`1 = 1`
      }

      return and(sql`${column} >= ${storeWallClockStartMs(filter.startDate)}`, sql`${column} < ${storeWallClockEndMs(filter.endDate)}`)!
    }
    default: {
      return sql`1 = 1`
    }
  }
}
