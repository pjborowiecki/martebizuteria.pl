import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { type AuditLogInsertRow, deleteAuditLogs, insertAuditLogs } from "~/src/modules/audit-log/audit-log.accessors"

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

const QUEUE_MAX_BATCH_SIZE = 50

const fullyDescribedEvent = (index: number): AuditLogInsertRow => ({
  action: "customer.page_viewed",
  actorId: `user-${String(index)}`,
  actorName: "Anna Kowalska",
  actorRole: "customer",
  category: "customers",
  createdAt: 1_790_000_000_000 + index,
  detail: `/en-US/products/lapis-lazuli-necklace?view=${String(index)}`,
  id: `log-${String(index).padStart(3, "0")}`,
  ip: "203.0.113.7",
  metadata: JSON.stringify({ referrer: "/en-US" }),
  resourceId: `user-${String(index)}`,
  severity: "info",
  target: "Anna Kowalska",
})

const storedIds = (): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare("select id from audit_log order by id").all())
    .map(({ id }) => id)

beforeEach(() => {
  sqlite.exec(`
    drop table if exists audit_log;
    create table audit_log (
      action text not null, actor_id text, actor_name text not null, actor_role text not null, category text not null,
      created_at integer not null, detail text, id text primary key, ip text, metadata text, resource_id text,
      severity text not null, target text not null
    );
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("insertAuditLogs on D1", () => {
  it("stores a full queue batch of fully described events", async () => {
    const events = Array.from({ length: QUEUE_MAX_BATCH_SIZE }, (_, index) => fullyDescribedEvent(index))

    await insertAuditLogs(events)

    expect(storedIds()).toStrictEqual(events.map(({ id }) => id))
  })

  it("stores none of the batch when one of its events cannot be written", async () => {
    const events = Array.from({ length: QUEUE_MAX_BATCH_SIZE }, (_, index) => fullyDescribedEvent(index))
    sqlite
      .prepare(
        "insert into audit_log (action, actor_name, actor_role, category, created_at, id, severity, target) values (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run("order.placed", "System", "system", "orders", 1, "log-049", "success", "Order")

    await expect(insertAuditLogs(events)).rejects.toThrow(/UNIQUE constraint failed/u)

    expect(storedIds()).toStrictEqual(["log-049"])
  })
})

describe("deleteAuditLogs on D1", () => {
  it("deletes a full page of selected events and reports how many it removed", async () => {
    const events = Array.from({ length: LIST_PAGE_SIZE_MAX + 2 }, (_, index) => fullyDescribedEvent(index))
    await insertAuditLogs(events)
    const ids = events.map(({ id }) => id)

    await expect(deleteAuditLogs(ids.slice(1, -1))).resolves.toBe(LIST_PAGE_SIZE_MAX)

    expect(storedIds()).toStrictEqual([ids[0], ids.at(-1)])
  })
})
