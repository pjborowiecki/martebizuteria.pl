import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

const sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })

const rowsSchema = z.array(z.object({ archived_at: z.number().nullable(), id: z.string(), rank: z.number() }))

beforeAll(() => {
  applyMigrationHistoryBefore(sqlite, MIGRATION.DELIVERY_METHOD_SETTINGS)
  sqlite.exec(`
    insert into courier (id, internal_code, name) values ('courier-inpost', 'inpost', 'InPost');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type, created_at) values
      ('a-pickup', 'pickup', 'courier-inpost', 'Odbiór', 0, 'in_store', 1),
      ('b-locker', 'locker', 'courier-inpost', 'Paczkomat', 1499, 'locker', 2),
      ('c-courier-late', 'courier-late', 'courier-inpost', 'Kurier ekspres', 2999, 'courier', 4),
      ('d-courier', 'courier', 'courier-inpost', 'Kurier', 1999, 'courier', 3);
  `)
  applyMigration(sqlite, MIGRATION.DELIVERY_METHOD_SETTINGS)
})

afterAll(() => {
  sqlite.close()
})

describe("the delivery method settings migration", () => {
  it("ranks the methods in the order the checkout showed them: couriers, then the locker, then pickup", () => {
    expect(rowsSchema.parse(sqlite.prepare("select id, rank, archived_at from delivery_method order by rank").all())).toStrictEqual([
      { archived_at: null, id: "d-courier", rank: 0 },
      { archived_at: null, id: "c-courier-late", rank: 1 },
      { archived_at: null, id: "b-locker", rank: 2 },
      { archived_at: null, id: "a-pickup", rank: 3 },
    ])
  })
})
