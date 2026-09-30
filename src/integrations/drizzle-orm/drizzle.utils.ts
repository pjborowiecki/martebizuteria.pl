import { sql } from "drizzle-orm"
import { type AnySQLiteColumn, integer } from "drizzle-orm/sqlite-core"

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

const MS_PER_SECOND = 1000

export const isoDayKey = (column: AnySQLiteColumn) => sql<string>`strftime('%Y-%m-%d', ${column} / ${MS_PER_SECOND}, 'unixepoch')`

export const isoMonthKey = (column: AnySQLiteColumn) => sql<string>`strftime('%Y-%m', ${column} / ${MS_PER_SECOND}, 'unixepoch')`
