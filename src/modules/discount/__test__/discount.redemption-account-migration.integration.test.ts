import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

const sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })

const UPDATED_BEFORE_BACKFILL = 1000

const redemptionsSchema = z.array(z.object({ id: z.string(), updated_at: z.number(), user_id: z.string().nullable() }))

const readRedemptions = () => {
  const rows = redemptionsSchema.parse(sqlite.prepare("select id, user_id, updated_at from discount_redemption").all())

  return Object.fromEntries(rows.map(({ id, updated_at, user_id }) => [id, { touched: updated_at > UPDATED_BEFORE_BACKFILL, user_id }]))
}

beforeAll(() => {
  applyMigrationHistoryBefore(sqlite, MIGRATION.DISCOUNT_REDEMPTION_ORDER_ACCOUNT)
  sqlite.exec(`
    insert into user (id, name, email, email_verified, created_at, updated_at) values
      ('anna', 'Anna', 'anna@example.test', 1, 0, 0),
      ('bartek', 'Bartek', 'bartek@example.test', 1, 0, 0);
    insert into discount (id, code, type, value) values ('spring', 'SPRING', 'percentage', 10);
    insert into "order" (id, email, user_id) values
      ('claimed-guest', 'anna@example.test', 'anna'),
      ('guest', 'nobody@example.test', null),
      ('signed-in', 'bartek@example.test', 'bartek');
    insert into discount_redemption (id, discount_id, order_id, user_id, email, amount, created_at, updated_at) values
      ('on-claimed-guest', 'spring', 'claimed-guest', null, 'anna@example.test', 1000, 0, ${String(UPDATED_BEFORE_BACKFILL)}),
      ('on-guest', 'spring', 'guest', null, 'nobody@example.test', 1000, 0, ${String(UPDATED_BEFORE_BACKFILL)}),
      ('on-signed-in', 'spring', 'signed-in', 'bartek', 'bartek@example.test', 1000, 0, ${String(UPDATED_BEFORE_BACKFILL)}),
      ('without-order', 'spring', null, null, 'anna@example.test', 1000, 0, ${String(UPDATED_BEFORE_BACKFILL)});
  `)
  applyMigration(sqlite, MIGRATION.DISCOUNT_REDEMPTION_ORDER_ACCOUNT)
})

afterAll(() => {
  sqlite.close()
})

describe("the discount redemption order account migration", () => {
  it("files the code redeemed on a guest order an account has since claimed under that account", () => {
    expect(readRedemptions()["on-claimed-guest"]).toStrictEqual({ touched: true, user_id: "anna" })
  })

  it("leaves the redemptions of guest orders, orders already filed and redemptions without an order as they were", () => {
    expect(readRedemptions()).toMatchObject({
      "on-guest": { touched: false, user_id: null },
      "on-signed-in": { touched: false, user_id: "bartek" },
      "without-order": { touched: false, user_id: null },
    })
  })
})
