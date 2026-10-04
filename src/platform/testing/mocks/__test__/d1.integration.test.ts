import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { type TestD1Query, type TestD1RoundTrip, createTestD1Database } from "~/src/platform/testing/mocks/d1"

const INSERT_ITEM = "insert into item (name) values (?)"
const SELECT_ITEMS = "select name from item order by id"

const sqlite = new DatabaseSync(":memory:")

const recordDatabase = () => {
  const queries: TestD1Query[] = []
  const trips: TestD1RoundTrip[] = []
  const database = createTestD1Database(
    sqlite,
    (query) => {
      queries.push(query)
    },
    (trip) => {
      trips.push(trip)
    },
  )

  return { database, queries, trips }
}

beforeAll(() => {
  sqlite.exec("create table item (id integer primary key, name text not null)")
})

afterAll(() => {
  sqlite.close()
})

describe("createTestD1Database round trips", () => {
  it("counts one batch of three statements as one round trip", async () => {
    const { database, trips } = recordDatabase()

    await database.batch([
      database.prepare(INSERT_ITEM).bind("ring"),
      database.prepare(INSERT_ITEM).bind("chain"),
      database.prepare(SELECT_ITEMS),
    ])

    expect(trips).toStrictEqual([{ kind: "batch", sql: [INSERT_ITEM, INSERT_ITEM, SELECT_ITEMS] }])
  })

  it("counts each statement outside a batch as its own round trip", async () => {
    const { database, trips } = recordDatabase()

    await database.prepare(SELECT_ITEMS).all()
    await database.prepare(INSERT_ITEM).bind("bracelet").run()

    expect(trips).toStrictEqual([
      { kind: "statement", sql: [SELECT_ITEMS] },
      { kind: "statement", sql: [INSERT_ITEM] },
    ])
  })

  it("counts a raw read as a round trip", async () => {
    const { database, trips } = recordDatabase()

    await database.prepare(SELECT_ITEMS).raw()

    expect(trips).toStrictEqual([{ kind: "statement", sql: [SELECT_ITEMS] }])
  })

  it("reports every statement through onQuery, batched or not", async () => {
    const { database, queries, trips } = recordDatabase()

    await database.batch([
      database.prepare(INSERT_ITEM).bind("brooch"),
      database.prepare(INSERT_ITEM).bind("pendant"),
      database.prepare(SELECT_ITEMS),
    ])
    await database.prepare(SELECT_ITEMS).all()
    await database.prepare(INSERT_ITEM).bind("anklet").run()

    expect(queries.map((query) => query.sql)).toStrictEqual([INSERT_ITEM, INSERT_ITEM, SELECT_ITEMS, SELECT_ITEMS, INSERT_ITEM])
    expect(trips.map((trip) => trip.kind)).toStrictEqual(["batch", "statement", "statement"])
  })

  it("reports each round trip when it is issued, before the batches settle", async () => {
    const { database, trips } = recordDatabase()

    const first = database.batch([database.prepare(SELECT_ITEMS)])
    const second = database.batch([database.prepare(SELECT_ITEMS)])
    const single = database.prepare(SELECT_ITEMS).all()

    expect(trips.map((trip) => trip.kind)).toStrictEqual(["batch", "batch", "statement"])

    const [[firstRead], [secondRead], singleRead] = await Promise.all([first, second, single])
    const rows = sqlite.prepare(SELECT_ITEMS).all()

    expect([firstRead?.results, secondRead?.results, singleRead.results]).toStrictEqual([rows, rows, rows])
  })

  it("counts a statement run on its own after a batch carried it", async () => {
    const { database, trips } = recordDatabase()
    const statement = database.prepare(SELECT_ITEMS)

    await database.batch([statement])
    await statement.all()
    await statement.raw()

    expect(trips).toStrictEqual([
      { kind: "batch", sql: [SELECT_ITEMS] },
      { kind: "statement", sql: [SELECT_ITEMS] },
      { kind: "statement", sql: [SELECT_ITEMS] },
    ])
  })

  it("keeps working without a round-trip callback", async () => {
    const database = createTestD1Database(sqlite)

    await database.batch([database.prepare(INSERT_ITEM).bind("earring")])
    const { results } = await database.prepare("select name from item where name = ?").bind("earring").all()
    const rows = await database.prepare("select count(*) from item where name = ?").bind("earring").raw()
    const { success } = await database.prepare("delete from item where name = ?").bind("earring").run()

    expect(results).toEqual([{ name: "earring" }])
    expect(rows).toStrictEqual([[1]])
    expect(success).toBe(true)
  })
})
