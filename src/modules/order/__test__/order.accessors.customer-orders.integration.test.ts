import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { getAdminOrdersExport, getAdminOrdersPage } from "~/src/modules/order/order.accessors"
import { ADMIN_ORDER_TAB } from "~/src/modules/order/order.constants"

const JANUARY = Date.UTC(2026, 0, 10)

const MARCH = Date.UTC(2026, 2, 10)

const JUNE = Date.UTC(2026, 5, 10)

const page = { limit: 10, offset: 0, timeZone: "Europe/Warsaw" }

beforeEach(() => {
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists payment;
    drop table if exists user;

    create table user (id text primary key, name text not null, email text not null, created_at integer not null, updated_at integer not null);
    create table payment (
      id text primary key, refunded_amount integer not null default 0, status text, transaction_id text,
      created_at integer not null, updated_at integer not null
    );
    create table "order" (
      id text primary key, checkout_id text, payment_id text, user_id text, email text not null,
      billing_company_name text, billing_nip text,
      currency_code text not null default 'PLN', status text not null default 'pending',
      fulfillment_status text not null default 'not_fulfilled', total integer not null default 0,
      metadata text, order_number text, tracking_number text,
      in_progress_email_at integer, shipped_email_at integer, delivered_email_at integer,
      created_at integer not null, updated_at integer not null
    );

    insert into user (id, name, email, created_at, updated_at) values
      ('u-anna', 'Anna Kowalska', 'anna@example.com', ${JANUARY}, ${JANUARY}),
      ('u-jan', 'Jan Nowak', 'jan@example.com', ${JANUARY}, ${JANUARY});

    insert into "order" (id, user_id, email, status, fulfillment_status, total, order_number, created_at, updated_at) values
      ('o-anna-pending', 'u-anna', 'anna@example.com', 'pending', 'not_fulfilled', 10000, 'MRT-2026-00001', ${JANUARY}, ${JANUARY}),
      ('o-anna-cancelled', 'u-anna', 'anna@example.com', 'cancelled', 'cancelled', 20000, 'MRT-2026-00002', ${MARCH}, ${MARCH}),
      ('o-anna-completed', 'u-anna', 'anna@example.com', 'completed', 'delivered', 30000, 'MRT-2026-00003', ${JUNE}, ${JUNE}),
      ('o-jan', 'u-jan', 'jan@example.com', 'processing', 'not_fulfilled', 40000, 'MRT-2026-00004', ${JUNE}, ${JUNE}),
      ('o-guest', null, 'anna@example.com', 'processing', 'not_fulfilled', 50000, 'MRT-2026-00005', ${JUNE}, ${JUNE});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getAdminOrdersPage scoped to a customer", () => {
  it("lists every order of that customer newest first, whatever its status, and counts only those", async () => {
    const result = await getAdminOrdersPage({ ...page, userId: "u-anna" })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["o-anna-completed", "o-anna-cancelled", "o-anna-pending"])
    expect(result.total).toBe(3)
  })

  it("leaves out a guest order placed with the same e-mail address", async () => {
    const result = await getAdminOrdersPage({ ...page, userId: "u-anna" })

    expect(result.rows.map((row) => row.id)).not.toContain("o-guest")
  })

  it("carries the customer the shared order columns show", async () => {
    const result = await getAdminOrdersPage({ ...page, userId: "u-anna" })

    expect(result.rows[0]).toMatchObject({ customerName: "Anna Kowalska", userId: "u-anna" })
  })

  it("pages through that customer's orders only", async () => {
    const result = await getAdminOrdersPage({ limit: 2, offset: 2, timeZone: "Europe/Warsaw", userId: "u-anna" })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["o-anna-pending"])
    expect(result.total).toBe(3)
  })

  it("combines the customer scope with the other filters", async () => {
    const result = await getAdminOrdersPage({ ...page, tab: ADMIN_ORDER_TAB.PENDING, userId: "u-anna" })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["o-anna-pending"])
  })

  it("finds nothing for a customer without orders", async () => {
    await expect(getAdminOrdersPage({ ...page, userId: "u-nobody" })).resolves.toStrictEqual({ rows: [], total: 0 })
  })
})

describe("getAdminOrdersExport scoped to a customer", () => {
  it("exports that customer's orders only", async () => {
    const rows = await getAdminOrdersExport({ timeZone: "Europe/Warsaw", userId: "u-jan" })

    expect(rows.map((row) => row.id)).toStrictEqual(["o-jan"])
  })
})
