import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

const orderSchema = z.array(z.object({ delivered_email_at: z.number().nullable(), id: z.string() }))

const database = { sqlite: new DatabaseSync(":memory:") }

const readOrders = () => orderSchema.parse(database.sqlite.prepare(`select id, delivered_email_at from "order" order by id`).all())

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  database.sqlite.exec(`
    create table "order" (id text primary key, fulfillment_status text not null, delivered_at integer, updated_at integer not null);
    insert into "order" (id, fulfillment_status, delivered_at, updated_at) values
      ('delivered', 'delivered', 3000, 9000),
      ('delivered-untimed', 'delivered', null, 4000),
      ('shipped', 'shipped', null, 9000);
  `)
})

afterEach(() => {
  database.sqlite.close()
})

describe("order delivered email backfill", () => {
  it("counts every order delivered before the column existed as thanked, and leaves the rest alone", () => {
    applyMigration(database.sqlite, MIGRATION.ORDER_DELIVERED_EMAIL)

    expect(readOrders()).toStrictEqual([
      { delivered_email_at: 3000, id: "delivered" },
      { delivered_email_at: 4000, id: "delivered-untimed" },
      { delivered_email_at: null, id: "shipped" },
    ])
  })
})
