import { SQLiteSyncDialect, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH, notInJsonList, timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

const table = sqliteTable("drizzle_utils_probe", {
  id: text("id", { length: UUID_STRING_LENGTH }).primaryKey(),
  plain: timestamp("plain"),
  ...timestamps(),
})

describe("timestamp columns", () => {
  it("stores dates as millisecond integers", () => {
    expect(table.plain.columnType).toBe("SQLiteTimestamp")
    expect(table.plain.mapToDriverValue(new Date("2026-09-27T10:00:00.000Z"))).toBe(Date.parse("2026-09-27T10:00:00.000Z"))
    expect(table.plain.mapFromDriverValue(1000)).toStrictEqual(new Date(1000))
  })

  it("leaves a bare timestamp nullable and without a default", () => {
    expect(table.plain.notNull).toBe(false)
    expect(table.plain.hasDefault).toBe(false)
  })
})

describe("timestamps helper", () => {
  it("maps both audit columns to snake case names", () => {
    expect(table.createdAt.name).toBe("created_at")
    expect(table.updatedAt.name).toBe("updated_at")
  })

  it("requires both audit columns and gives them a database side default", () => {
    expect(table.createdAt.notNull).toBe(true)
    expect(table.updatedAt.notNull).toBe(true)
    expect(table.createdAt.hasDefault).toBe(true)
    expect(table.updatedAt.hasDefault).toBe(true)
  })

  it("falls back to the current date when the driver supplies no default", () => {
    expect(table.createdAt.defaultFn?.()).toBeInstanceOf(Date)
    expect(table.updatedAt.defaultFn?.()).toBeInstanceOf(Date)
  })

  it("refreshes only the edited column on update", () => {
    expect(table.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
    expect(table.createdAt.onUpdateFn).toBeUndefined()
  })
})

describe("uuid column length", () => {
  it("matches the textual length of a uuid", () => {
    expect(UUID_STRING_LENGTH).toBe(crypto.randomUUID().length)
  })
})

describe("JSON id lists", () => {
  const dialect = new SQLiteSyncDialect()
  const ids = Array.from({ length: 250 }, (_, index) => `id-${String(index)}`)

  it("excludes a list of any length through a single parameter", () => {
    const query = dialect.sqlToQuery(notInJsonList(table.id, ids))

    expect(query.sql).toBe('"drizzle_utils_probe"."id" not in (select value from json_each(?))')
    expect(query.params).toStrictEqual([JSON.stringify(ids)])
  })
})
