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

import { newCustomersQuery } from "~/src/modules/user/user.accessors"

const JANUARY = Date.UTC(2024, 0, 10)

const FEBRUARY = Date.UTC(2024, 1, 10)

const MARCH = Date.UTC(2024, 2, 10)

const WINDOW_START = new Date(Date.UTC(2024, 0, 1))

const WINDOW_END = new Date(Date.UTC(2024, 2, 1))

beforeEach(() => {
  sqlite.exec(`
    drop table if exists user;

    create table user (id text primary key, name text not null, email text not null, created_at integer not null, updated_at integer not null);

    insert into user (id, name, email, created_at, updated_at) values
      ('u-anna', 'Anna Kowalska', 'anna@example.com', ${JANUARY}, ${JANUARY}),
      ('u-borys', 'Borys Nowak', 'borys@example.com', ${FEBRUARY}, ${FEBRUARY}),
      ('u-celina', 'Celina Wolska', 'celina@example.com', ${MARCH}, ${MARCH});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("newCustomersQuery", () => {
  it("counts every account created since the window start", async () => {
    const rows = await newCustomersQuery(WINDOW_START)

    expect(rows[0]?.count).toBe(3)
  })

  it("counts only the accounts created before the window end", async () => {
    const rows = await newCustomersQuery(WINDOW_START, WINDOW_END)

    expect(rows[0]?.count).toBe(2)
  })
})
