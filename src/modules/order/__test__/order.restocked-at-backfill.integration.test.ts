import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

const orderSchema = z.array(z.object({ id: z.string(), restocked_at: z.number().nullable() }))

const database = { sqlite: new DatabaseSync(":memory:") }

const readOrders = () => orderSchema.parse(database.sqlite.prepare(`select id, restocked_at from "order" order by id`).all())

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  database.sqlite.exec(`
    create table payment (id text primary key, refunded_at integer);
    create table "order" (id text primary key, payment_id text, status text not null, canceled_at integer, updated_at integer not null);
    insert into payment (id, refunded_at) values ('pay_refunded', 2000), ('pay_unrecorded', null);
    insert into "order" (id, payment_id, status, canceled_at, updated_at) values
      ('cancelled', 'pay_refunded', 'cancelled', 1000, 9000),
      ('completed', 'pay_refunded', 'completed', null, 9000),
      ('processing', null, 'processing', null, 9000),
      ('refunded', 'pay_refunded', 'refunded', null, 9000),
      ('refunded_unrecorded', 'pay_unrecorded', 'refunded', null, 3000);
  `)
})

afterEach(() => {
  database.sqlite.close()
})

describe("order restocked_at backfill", () => {
  it("marks every order closed before the column existed as restocked, dated when it closed, and leaves open ones alone", () => {
    applyMigration(database.sqlite, MIGRATION.ORDER_RESTOCKED_AT)

    expect(readOrders()).toStrictEqual([
      { id: "cancelled", restocked_at: 1000 },
      { id: "completed", restocked_at: null },
      { id: "processing", restocked_at: null },
      { id: "refunded", restocked_at: 2000 },
      { id: "refunded_unrecorded", restocked_at: 3000 },
    ])
  })
})
