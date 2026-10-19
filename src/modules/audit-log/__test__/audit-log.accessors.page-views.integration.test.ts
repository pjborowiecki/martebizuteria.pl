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

import { pageViewsQuery } from "~/src/modules/audit-log/audit-log.accessors"

const JANUARY = Date.UTC(2024, 0, 10)

const FEBRUARY = Date.UTC(2024, 1, 10)

const MARCH = Date.UTC(2024, 2, 10)

const WINDOW_START = new Date(Date.UTC(2024, 0, 1))

const WINDOW_END = new Date(Date.UTC(2024, 2, 1))

beforeEach(() => {
  sqlite.exec(`
    drop table if exists audit_log;

    create table audit_log (id text primary key, action text not null, created_at integer not null);

    insert into audit_log (id, action, created_at) values
      ('a-1', 'customer.page_viewed', ${JANUARY}),
      ('a-2', 'customer.page_viewed', ${FEBRUARY}),
      ('a-3', 'auth.login', ${FEBRUARY}),
      ('a-4', 'customer.page_viewed', ${MARCH});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("pageViewsQuery", () => {
  it("counts page view audit rows and ignores other actions", async () => {
    const rows = await pageViewsQuery(WINDOW_START)

    expect(rows[0]?.count).toBe(3)
  })

  it("counts only the page views inside the window", async () => {
    const rows = await pageViewsQuery(WINDOW_START, WINDOW_END)

    expect(rows[0]?.count).toBe(2)
  })
})
