import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

const entriesSchema = z.array(z.object({ detail: z.string().nullable(), id: z.string() }))

const database = { sqlite: new DatabaseSync(":memory:") }

const insertEntry = (id: string, action: string, detail: string): void => {
  database.sqlite
    .prepare(
      `insert into audit_log (id, action, category, severity, actor_name, actor_role, target, detail, metadata, created_at)
        values (?, ?, 'customers', 'warning', 'Ada Nowak', 'customer', 'ada@marte.test', ?, '{"email":"ada@marte.test","itemCount":3}', 1792238400000)`,
    )
    .run(id, action, detail)
}

const readEntries = () => entriesSchema.parse(database.sqlite.prepare("select id, detail from audit_log order by id").all())

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  applyMigrationHistoryBefore(database.sqlite, MIGRATION.CART_ABANDONED_WITHOUT_NAME)
})

afterEach(() => {
  database.sqlite.close()
})

describe("the migration that takes customers' names out of abandoned cart entries", () => {
  it("clears a detail that only repeats the customer's name and leaves every other detail as it was", () => {
    insertEntry("abandoned-named", "customer.cart_abandoned", "Ada Nowak")
    insertEntry("abandoned-counted", "customer.cart_abandoned", "3 items in cart")
    insertEntry("login-named", "auth.login", "Ada Nowak")
    insertEntry("item-added", "customer.cart_item_added", "Silver ring")

    applyMigration(database.sqlite, MIGRATION.CART_ABANDONED_WITHOUT_NAME)

    expect(readEntries()).toStrictEqual([
      { detail: "3 items in cart", id: "abandoned-counted" },
      { detail: null, id: "abandoned-named" },
      { detail: "Silver ring", id: "item-added" },
      { detail: "Ada Nowak", id: "login-named" },
    ])
  })

  it("changes nothing when it runs again", () => {
    insertEntry("abandoned-named", "customer.cart_abandoned", "Ada Nowak")
    applyMigration(database.sqlite, MIGRATION.CART_ABANDONED_WITHOUT_NAME)

    applyMigration(database.sqlite, MIGRATION.CART_ABANDONED_WITHOUT_NAME)

    expect(readEntries()).toStrictEqual([{ detail: null, id: "abandoned-named" }])
  })
})
