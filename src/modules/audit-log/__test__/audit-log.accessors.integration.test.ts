import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import {
  type AuditLogInsertRow,
  deleteAuditLogs,
  getAdminAuditLogStats,
  getAdminAuditLogsPage,
  insertAuditLogs,
} from "~/src/modules/audit-log/audit-log.accessors"
import { buildAuditLogDayFilter, resolveAuditLogToday } from "~/src/modules/audit-log/audit-log.utils"

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

const PAST_MIDNIGHT_IN_POLAND = new Date("2026-10-14T22:30:00.000Z")

const eventAt = (id: string, createdAt: string, severity: AuditLogInsertRow["severity"] = "info"): AuditLogInsertRow => ({
  ...fullyDescribedEvent(0),
  createdAt: Date.parse(createdAt),
  id,
  severity,
})

const seedAroundMidnightInPoland = (): Promise<void> =>
  insertAuditLogs([
    eventAt("log-14-oct-02-00", "2026-10-14T00:00:00.000Z"),
    eventAt("log-14-oct-23-35", "2026-10-14T21:35:00.000Z", "warning"),
    eventAt("log-15-oct-00-10", "2026-10-14T22:10:00.000Z", "warning"),
    eventAt("log-15-oct-23-59", "2026-10-15T21:59:59.999Z", "error"),
    eventAt("log-16-oct-00-00", "2026-10-15T22:00:00.000Z"),
  ])

const listIds = async (params: Omit<Parameters<typeof getAdminAuditLogsPage>[0], "limit" | "offset">): Promise<string[]> => {
  const { rows } = await getAdminAuditLogsPage({ ...params, limit: LIST_PAGE_SIZE_MAX, offset: 0 })

  return rows.map(({ id }) => id).toSorted()
}

describe("the today card on D1 just after midnight in Poland", () => {
  it("counts only what happened since midnight in Poland, though it is still the 14th in UTC", async () => {
    await seedAroundMidnightInPoland()

    await expect(getAdminAuditLogStats(resolveAuditLogToday(PAST_MIDNIGHT_IN_POLAND))).resolves.toMatchObject({ todayCount: 2 })
  })

  it("lists exactly the events it counts when its filter is applied", async () => {
    await seedAroundMidnightInPoland()
    const today = resolveAuditLogToday(PAST_MIDNIGHT_IN_POLAND)

    await expect(listIds({ createdAt: buildAuditLogDayFilter(today) })).resolves.toStrictEqual(["log-15-oct-00-10", "log-15-oct-23-59"])
  })

  it("lists exactly the events the warning and error cards count", async () => {
    await seedAroundMidnightInPoland()
    const stats = await getAdminAuditLogStats(resolveAuditLogToday(PAST_MIDNIGHT_IN_POLAND))

    await expect(listIds({ severity: "warning" })).resolves.toHaveLength(stats.warningCount)
    await expect(listIds({ severity: "error" })).resolves.toHaveLength(stats.errorCount)
    expect(stats).toStrictEqual({ errorCount: 1, todayCount: 2, totalCount: 5, warningCount: 2 })
  })

  it("shows today's warnings when the warning filter and the today filter are both applied", async () => {
    await seedAroundMidnightInPoland()
    const today = resolveAuditLogToday(PAST_MIDNIGHT_IN_POLAND)

    await expect(listIds({ createdAt: buildAuditLogDayFilter(today), severity: "warning" })).resolves.toStrictEqual(["log-15-oct-00-10"])
  })
})
