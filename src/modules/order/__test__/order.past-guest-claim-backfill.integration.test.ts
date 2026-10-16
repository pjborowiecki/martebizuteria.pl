import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

const UPDATED_BEFORE_BACKFILL = 1000

const orderSchema = z.array(z.object({ id: z.string(), updated_at: z.number(), user_id: z.string().nullable() }))

const claimMetadataSchema = z.object({ orderCount: z.number(), orderIds: z.array(z.string()).transform((orderIds) => orderIds.toSorted()) })

const auditSchema = z.array(
  z.object({
    action: z.string(),
    actor_id: z.null(),
    actor_name: z.string(),
    actor_role: z.string(),
    category: z.string(),
    metadata: z.string().transform((metadata) => claimMetadataSchema.parse(JSON.parse(metadata))),
    resource_id: z.string(),
    severity: z.string(),
    target: z.string(),
  }),
)

const database = { sqlite: new DatabaseSync(":memory:") }

const readOrders = () =>
  orderSchema
    .parse(database.sqlite.prepare(`select id, user_id, updated_at from "order" order by id`).all())
    .map(({ id, updated_at, user_id }) => ({ id, touched: updated_at > UPDATED_BEFORE_BACKFILL, user_id }))

const readClaims = () =>
  auditSchema.parse(
    database.sqlite
      .prepare(
        "select action, actor_id, actor_name, actor_role, category, metadata, resource_id, severity, target from audit_log order by resource_id",
      )
      .all(),
  )

const readClaimIds = () => z.array(z.object({ id: z.uuid() })).parse(database.sqlite.prepare("select id from audit_log").all())

const claimOf = (userId: string, target: string, orderIds: readonly string[]) => ({
  action: "customer.orders_claimed",
  actor_id: null,
  actor_name: "System",
  actor_role: "system",
  category: "customers",
  metadata: { orderCount: orderIds.length, orderIds },
  resource_id: userId,
  severity: "info",
  target,
})

beforeEach(() => {
  database.sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })
  database.sqlite.exec(`
    create table user (id text primary key, email text not null unique, email_verified integer not null, created_at integer not null);
    create table "order" (id text primary key, email text not null, user_id text, updated_at integer not null);
    create table audit_log (
      id text primary key, action text not null, actor_id text, actor_name text not null, actor_role text not null, category text not null,
      created_at integer not null, detail text, ip text, metadata text, resource_id text, severity text not null, target text not null
    );
    insert into user (id, email, email_verified, created_at) values
      ('anna', 'anna@example.test', 1, 100),
      ('bartek', 'Bartek@Example.test', 1, 100),
      ('celina', 'celina@example.test', 0, 100),
      ('dorota', 'dorota@example.test', 1, 100);
    insert into "order" (id, email, user_id, updated_at) values
      ('anna-1', 'anna@example.test', null, 1000),
      ('anna-2', 'ANNA@example.test', null, 1000),
      ('anna-signed-in', 'anna@example.test', 'anna', 1000),
      ('bartek-1', 'bartek@example.test', null, 1000),
      ('celina-1', 'celina@example.test', null, 1000),
      ('dorota-for-a-friend', 'anna@example.test', 'dorota', 1000),
      ('nobody-1', 'nobody@example.test', null, 1000);
  `)
})

afterEach(() => {
  database.sqlite.close()
})

describe("past guest order claim backfill", () => {
  it("files every guest order under the verified account with its email, ignoring case, and leaves the rest alone", () => {
    applyMigration(database.sqlite, MIGRATION.CLAIM_PAST_GUEST_ORDERS)

    expect(readOrders()).toStrictEqual([
      { id: "anna-1", touched: true, user_id: "anna" },
      { id: "anna-2", touched: true, user_id: "anna" },
      { id: "anna-signed-in", touched: false, user_id: "anna" },
      { id: "bartek-1", touched: true, user_id: "bartek" },
      { id: "celina-1", touched: false, user_id: null },
      { id: "dorota-for-a-friend", touched: false, user_id: "dorota" },
      { id: "nobody-1", touched: false, user_id: null },
    ])
  })

  it("records one claim per account in the audit log, as the claim at verification does", () => {
    applyMigration(database.sqlite, MIGRATION.CLAIM_PAST_GUEST_ORDERS)

    expect(readClaims()).toStrictEqual([
      claimOf("anna", "anna@example.test", ["anna-1", "anna-2"]),
      claimOf("bartek", "bartek@example.test", ["bartek-1"]),
    ])
    expect(new Set(readClaimIds().map(({ id }) => id)).size).toBe(2)
  })

  it("gives the orders of an address two verified accounts share, ignoring case, to the older account", () => {
    database.sqlite.exec(`
      insert into user (id, email, email_verified, created_at) values ('ewa-new', 'ewa@example.test', 1, 200), ('ewa-old', 'EWA@example.test', 1, 100);
      insert into "order" (id, email, user_id, updated_at) values ('ewa-1', 'ewa@example.test', null, 1000);
    `)

    applyMigration(database.sqlite, MIGRATION.CLAIM_PAST_GUEST_ORDERS)

    expect(readOrders()).toContainEqual({ id: "ewa-1", touched: true, user_id: "ewa-old" })
    expect(readClaims().filter((claim) => claim.target === "ewa@example.test")).toStrictEqual([
      claimOf("ewa-old", "ewa@example.test", ["ewa-1"]),
    ])
  })

  it("claims nothing more when it runs again", () => {
    applyMigration(database.sqlite, MIGRATION.CLAIM_PAST_GUEST_ORDERS)
    const ordersAfterFirstRun = readOrders()

    applyMigration(database.sqlite, MIGRATION.CLAIM_PAST_GUEST_ORDERS)

    expect(readOrders()).toStrictEqual(ordersAfterFirstRun)
    expect(readClaims()).toHaveLength(2)
  })
})
