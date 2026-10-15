import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

const orderSchema = z.array(
  z.object({ fulfillment_started_at: z.number().nullable(), id: z.string(), in_progress_email_at: z.number().nullable() }),
)

const database = { sqlite: new DatabaseSync(":memory:") }

const readOrders = () =>
  orderSchema.parse(database.sqlite.prepare(`select id, fulfillment_started_at, in_progress_email_at from "order" order by id`).all())

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  database.sqlite.exec(`
    create table audit_log (id text primary key, action text not null, resource_id text, created_at integer not null);
    create table "order" (
      id text primary key, fulfillment_status text not null, shipped_at integer, delivered_at integer, updated_at integer not null
    );
    insert into audit_log (id, action, resource_id, created_at) values
      ('a-1', 'order.fulfillment_started', 'in-progress', 700),
      ('a-2', 'order.fulfillment_started', 'in-progress', 800),
      ('a-3', 'order.shipped', 'shipped', 900),
      ('a-4', 'order.fulfillment_started', 'confirmed', 600);
    insert into "order" (id, fulfillment_status, shipped_at, delivered_at, updated_at) values
      ('confirmed', 'not_fulfilled', null, null, 9000),
      ('delivered', 'delivered', null, 3000, 9000),
      ('in-progress', 'fulfilled', null, null, 9000),
      ('in-progress-unlogged', 'fulfilled', null, null, 5000),
      ('shipped', 'shipped', 1000, null, 9000);
  `)
})

afterEach(() => {
  database.sqlite.close()
})

describe("order fulfilment started backfill", () => {
  it("dates each order past confirmation from its first fulfilment entry, or else its later steps, and counts it as told", () => {
    applyMigration(database.sqlite, MIGRATION.ORDER_FULFILLMENT_STARTED)

    expect(readOrders()).toStrictEqual([
      { fulfillment_started_at: null, id: "confirmed", in_progress_email_at: null },
      { fulfillment_started_at: 3000, id: "delivered", in_progress_email_at: 3000 },
      { fulfillment_started_at: 700, id: "in-progress", in_progress_email_at: 700 },
      { fulfillment_started_at: 5000, id: "in-progress-unlogged", in_progress_email_at: 5000 },
      { fulfillment_started_at: 1000, id: "shipped", in_progress_email_at: 1000 },
    ])
  })
})
