import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

const orderSchema = z.array(
  z.object({ id: z.string(), shipped_email_at: z.number().nullable(), tracking_email_number: z.string().nullable() }),
)

const database = { sqlite: new DatabaseSync(":memory:") }

const readOrders = () =>
  orderSchema.parse(database.sqlite.prepare(`select id, shipped_email_at, tracking_email_number from "order" order by id`).all())

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  database.sqlite.exec(`
    create table "order" (
      id text primary key, fulfillment_status text not null, shipped_at integer, delivered_at integer,
      tracking_number text, updated_at integer not null
    );
    insert into "order" (id, fulfillment_status, shipped_at, delivered_at, tracking_number, updated_at) values
      ('confirmed', 'not_fulfilled', null, null, null, 9000),
      ('delivered', 'delivered', 2000, 3000, 'TRK-2', 9000),
      ('in-progress', 'fulfilled', null, null, null, 9000),
      ('shipped', 'shipped', 1000, null, 'TRK-1', 9000),
      ('shipped-untimed', 'shipped', null, null, null, 4000);
  `)
})

afterEach(() => {
  database.sqlite.close()
})

describe("order shipped email backfill", () => {
  it("counts every order shipped before the column existed as told, with the number it had, and leaves the rest untold", () => {
    applyMigration(database.sqlite, MIGRATION.ORDER_SHIPPED_EMAIL)

    expect(readOrders()).toStrictEqual([
      { id: "confirmed", shipped_email_at: null, tracking_email_number: null },
      { id: "delivered", shipped_email_at: 2000, tracking_email_number: "TRK-2" },
      { id: "in-progress", shipped_email_at: null, tracking_email_number: null },
      { id: "shipped", shipped_email_at: 1000, tracking_email_number: "TRK-1" },
      { id: "shipped-untimed", shipped_email_at: 4000, tracking_email_number: null },
    ])
  })
})
