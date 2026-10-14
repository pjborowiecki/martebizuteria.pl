import { type SQL, sql } from "drizzle-orm"
import { type AnySQLiteColumn, integer } from "drizzle-orm/sqlite-core"

import { type CalendarPeriod } from "~/src/modules/_core/utils/datetime"

export const UUID_STRING_LENGTH = 36

export const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" })

const nowMs = sql`(unixepoch() * 1000)`

export const timestampNow = (name: string) =>
  timestamp(name)
    .default(nowMs)
    .$defaultFn(() => new Date())
    .notNull()

export const timestamps = () => ({
  createdAt: timestampNow("created_at"),
  updatedAt: timestampNow("updated_at").$onUpdateFn(() => new Date()),
})

export const calendarPeriodKey = (column: AnySQLiteColumn, periods: readonly CalendarPeriod[]) => {
  const startMsByKey = Object.fromEntries(periods.map(({ key, start }) => [key, start.getTime()]))

  return sql<string>`(select key from json_each(${JSON.stringify(startMsByKey)}) where value <= ${column} order by value desc limit 1)`
}

export const inJsonList = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} in (select value from json_each(${JSON.stringify(values)}))`

export const notInJsonList = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} not in (select value from json_each(${JSON.stringify(values)}))`
