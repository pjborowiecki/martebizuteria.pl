import { drizzle } from "drizzle-orm/d1"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { createTestD1Database } from "~/src/platform/testing/mocks/d1"

import { buildAdminSearchOrCondition, localizedTextColumns } from "~/src/modules/_core/utils/search-conditions.server"

const sqlite = new DatabaseSync(":memory:")

const database = drizzle(createTestD1Database(sqlite))

const entries = sqliteTable("search_entry", {
  id: integer("id").primaryKey(),
  label: text("label").notNull(),
  reference: integer("reference").notNull(),
})

beforeAll(() => {
  sqlite.exec("create table search_entry (id integer primary key, label text not null, reference integer not null)")
  const labels = [
    "Silver ring",
    "100% silver",
    "100 gold",
    "ring_1",
    "ringA1",
    String.raw`path\leaf`,
    "pathleaf",
    String.raw`combo%_\done`,
    "x' OR 1=1 --",
  ]
  const insert = sqlite.prepare("insert into search_entry (id, label, reference) values (?, ?, ?)")

  for (const [index, label] of labels.entries()) {
    insert.run(index + 1, label, 4815 + index)
  }
})

afterAll(() => {
  sqlite.close()
})

describe("admin search against SQLite", () => {
  it.each([
    { ids: [1, 2], search: "  SILVER  " },
    { ids: [2], search: "100%" },
    { ids: [4], search: "ring_1" },
    { ids: [6], search: "path\\" },
    { ids: [8], search: "%_\\" },
    { ids: [9], search: "x' OR 1=1 --" },
  ])("matches $search as literal text", async ({ ids, search }) => {
    const rows = await database
      .select({ id: entries.id })
      .from(entries)
      .where(buildAdminSearchOrCondition(search, [entries.label]))
      .orderBy(entries.id)

    expect(rows.map((row) => row.id)).toStrictEqual(ids)
  })

  it("matches any supplied column, including a numeric reference", async () => {
    const rows = await database
      .select({ id: entries.id })
      .from(entries)
      .where(buildAdminSearchOrCondition("4815", [entries.label, entries.reference]))

    expect(rows).toStrictEqual([{ id: 1 }])
  })
})

const copy = sqliteTable("search_copy", {
  id: integer("id").primaryKey(),
  titles: text("titles", { mode: "json" }).notNull(),
})

const idsMatching = async (term: string): Promise<number[]> => {
  const rows = await database
    .select({ id: copy.id })
    .from(copy)
    .where(buildAdminSearchOrCondition(term, localizedTextColumns(copy.titles)))

  return rows.map((row) => row.id)
}

describe("localizedTextColumns", () => {
  beforeAll(() => {
    sqlite.exec("create table search_copy (id integer primary key, titles text not null)")
    sqlite
      .prepare("insert into search_copy (id, titles) values (?, ?)")
      .run(1, JSON.stringify({ "en-US": "Aurora Ring", "pl-PL": "Pierścionek Aurora" }))
  })

  it("matches the copy of every locale", async () => {
    await expect(idsMatching("aurora")).resolves.toStrictEqual([1])
    await expect(idsMatching("pierścionek")).resolves.toStrictEqual([1])
  })

  it("never matches the locale keys or the JSON syntax around the copy", async () => {
    await expect(idsMatching("pl")).resolves.toStrictEqual([])
    await expect(idsMatching("en-US")).resolves.toStrictEqual([])
    await expect(idsMatching('"')).resolves.toStrictEqual([])
  })
})
