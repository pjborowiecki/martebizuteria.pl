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

const storedDetail = (id: string): string | null =>
  z.object({ detail: z.string().nullable() }).parse(sqlite.prepare("select detail from audit_log where id = ?").get(id)).detail

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
    sqlite.exec(`
      create trigger audit_log_refuses_last_event before insert on audit_log when new.id = 'log-049'
      begin select raise(abort, 'audit_log refused log-049'); end;
    `)

    await expect(insertAuditLogs(events)).rejects.toThrow(/audit_log refused log-049/u)

    expect(storedIds()).toStrictEqual([])
  })

  it("keeps the entry already stored under an id the batch repeats and stores the rest", async () => {
    const events = Array.from({ length: QUEUE_MAX_BATCH_SIZE }, (_, index) => fullyDescribedEvent(index))
    await insertAuditLogs([{ ...fullyDescribedEvent(49), detail: "first delivery" }])

    await insertAuditLogs(events)

    expect(storedIds()).toStrictEqual(events.map(({ id }) => id))
    expect(storedDetail("log-049")).toBe("first delivery")
  })
})

describe("deleteAuditLogs on D1", () => {
  it("deletes a full page of selected events and reports the ids it removed", async () => {
    const events = Array.from({ length: LIST_PAGE_SIZE_MAX + 2 }, (_, index) => fullyDescribedEvent(index))
    await insertAuditLogs(events)
    const ids = events.map(({ id }) => id)
    const selected = ids.slice(1, -1)

    const deleted = await deleteAuditLogs(selected)

    expect(deleted.toSorted()).toStrictEqual(selected)
    expect(storedIds()).toStrictEqual([ids[0], ids.at(-1)])
  })

  it("leaves out of its report an id that matched no stored event", async () => {
    await insertAuditLogs([fullyDescribedEvent(0), fullyDescribedEvent(1)])

    await expect(deleteAuditLogs(["log-000", "log-missing"])).resolves.toStrictEqual(["log-000"])

    expect(storedIds()).toStrictEqual(["log-001"])
  })
})
