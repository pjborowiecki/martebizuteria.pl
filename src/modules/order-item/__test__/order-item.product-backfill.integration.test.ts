import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

const lineSchema = z.array(z.object({ id: z.string(), product_id: z.string().nullable() }))

const database = { sqlite: new DatabaseSync(":memory:") }

const readLines = () => lineSchema.parse(database.sqlite.prepare("select id, product_id from order_item order by id").all())

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:")
  database.sqlite.exec(`
    create table product_variant (id text primary key, product_id text not null);
    create table order_item (id text primary key, product_id text, variant_id text);
    insert into product_variant (id, product_id) values ('var_onyx', 'prod_onyx'), ('var_lapis', 'prod_lapis');
    insert into order_item (id, product_id, variant_id) values
      ('line_missing', null, 'var_onyx'),
      ('line_recorded', 'prod_kept', 'var_lapis'),
      ('line_orphaned', null, null);
  `)
})

afterEach(() => {
  database.sqlite.close()
})

describe("order item product backfill", () => {
  it("fills in the product of every line whose variant still exists and leaves the rest alone", () => {
    applyMigration(database.sqlite, MIGRATION.ORDER_ITEM_PRODUCT_BACKFILL)

    expect(readLines()).toStrictEqual([
      { id: "line_missing", product_id: "prod_onyx" },
      { id: "line_orphaned", product_id: null },
      { id: "line_recorded", product_id: "prod_kept" },
    ])
  })
})
