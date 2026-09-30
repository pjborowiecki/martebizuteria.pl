import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { deleteAuditLogs, getAdminAuditLogStats, getAdminAuditLogsPage, insertAuditLogs } from "~/src/modules/audit-log/audit-log.accessors"

const database = vi.hoisted(() => ({
  batch: vi.fn((): Promise<unknown> => Promise.resolve([[{ count: 0 }], []])),
  deletes: [] as unknown[],
  inserts: [] as unknown[],
  limits: [] as (number | undefined)[],
  offsets: [] as (number | undefined)[],
  rows: [] as unknown[],
  wheres: [] as (SQL | undefined)[],
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => {
  const chain = {
    limit: (limit: number | undefined) => {
      database.limits.push(limit)

      return chain
    },
    offset: (offset: number | undefined) => {
      database.offsets.push(offset)

      return Promise.resolve(database.rows)
    },
    orderBy: () => chain,
  }

  const from = () => ({
    where: (where: SQL | undefined) => {
      database.wheres.push(where)

      return chain
    },
  })

  return {
    db: {
      batch: database.batch,
      delete: () => ({
        where: (where: SQL) => {
          database.deletes.push(where)

          return Promise.resolve(undefined)
        },
      }),
      insert: () => ({
        values: (values: unknown) => {
          database.inserts.push(values)

          return Promise.resolve(undefined)
        },
      }),
      select: () => ({ from }),
    },
  }
})

const dialect = new SQLiteSyncDialect()

const lastWhere = (): SQL => {
  const where = database.wheres.at(-1)

  if (!(where instanceof SQL)) {
    throw new TypeError("The last query was built without a where clause")
  }

  return where
}

const listParams = { limit: 50, offset: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  database.deletes = []
  database.inserts = []
  database.limits = []
  database.offsets = []
  database.rows = []
  database.wheres = []
  database.batch.mockImplementation(() => Promise.resolve([[{ count: 0 }], database.rows]))
})

describe("getAdminAuditLogsPage where clause", () => {
  it("omits the where clause when no filter is set", async () => {
    await getAdminAuditLogsPage(listParams)

    expect(database.wheres).toStrictEqual([undefined, undefined])
  })

  it("filters on the severity", async () => {
    await getAdminAuditLogsPage({ ...listParams, severity: "error" })

    const query = dialect.sqlToQuery(lastWhere())

    expect(query.sql).toBe('"audit_log"."severity" = ?')
    expect(query.params).toStrictEqual(["error"])
  })

  it("filters on the category", async () => {
    await getAdminAuditLogsPage({ ...listParams, category: "orders" })

    expect(dialect.sqlToQuery(lastWhere()).params).toStrictEqual(["orders"])
  })

  it("searches the action, target, detail, actor name and ip columns", async () => {
    await getAdminAuditLogsPage({ ...listParams, search: "  Ada  " })

    const query = dialect.sqlToQuery(lastWhere())

    expect(query.sql).toContain('lower(cast("audit_log"."action" as text)) like ?')
    expect(query.sql).toContain('lower(cast("audit_log"."ip" as text)) like ?')
    expect(query.params).toStrictEqual(["%ada%", "%ada%", "%ada%", "%ada%", "%ada%"])
  })

  it("ignores a blank search term", async () => {
    await getAdminAuditLogsPage({ ...listParams, search: "   " })

    expect(database.wheres).toStrictEqual([undefined, undefined])
  })

  it("combines every filter with and", async () => {
    await getAdminAuditLogsPage({ ...listParams, category: "auth", search: "ada", severity: "warning" })

    const query = dialect.sqlToQuery(lastWhere())

    expect(query.sql).toContain(" and ")
    expect(query.params).toStrictEqual(["warning", "auth", "%ada%", "%ada%", "%ada%", "%ada%", "%ada%"])
  })

  it("bounds a created at filter to the day", async () => {
    await getAdminAuditLogsPage({ ...listParams, createdAt: { date: "2026-01-15T00:00", operator: "on" } })

    const query = dialect.sqlToQuery(lastWhere())

    expect(query.sql).toBe('("audit_log"."created_at" >= ? and "audit_log"."created_at" <= ?)')
    expect(query.params).toHaveLength(2)
  })

  it("applies the requested limit and offset to the row query", async () => {
    await getAdminAuditLogsPage({ limit: 25, offset: 0 })

    expect(database.limits).toStrictEqual([25])
    expect(database.offsets).toStrictEqual([0])
  })
})

describe("getAdminAuditLogsPage result", () => {
  it("returns the counted total alongside the first page", async () => {
    database.rows = [{ id: "log-1" }]
    database.batch.mockResolvedValue([[{ count: 3 }], [{ id: "log-1" }]])

    await expect(getAdminAuditLogsPage(listParams)).resolves.toStrictEqual({ rows: [{ id: "log-1" }], total: 3 })
  })

  it("falls back to a zero total when the count row is missing", async () => {
    database.batch.mockResolvedValue([[], []])

    await expect(getAdminAuditLogsPage(listParams)).resolves.toStrictEqual({ rows: [], total: 0 })
  })

  it("skips the count query for a later page", async () => {
    database.rows = [{ id: "log-9" }]

    await expect(getAdminAuditLogsPage({ limit: 50, offset: 50 })).resolves.toStrictEqual({ rows: [{ id: "log-9" }] })
    expect(database.batch).not.toHaveBeenCalled()
    expect(database.wheres).toHaveLength(1)
  })
})

describe("getAdminAuditLogStats", () => {
  it("maps the four batched counts onto the stats shape", async () => {
    database.batch.mockResolvedValue([[{ count: 10 }], [{ count: 4 }], [{ count: 2 }], [{ count: 1 }]])

    await expect(getAdminAuditLogStats(new Date(1_700_000_000_000))).resolves.toStrictEqual({
      errorCount: 1,
      todayCount: 4,
      totalCount: 10,
      warningCount: 2,
    })
  })

  it("defaults every count to zero when a row is missing", async () => {
    database.batch.mockResolvedValue([[], [], [], []])

    await expect(getAdminAuditLogStats(new Date(1_700_000_000_000))).resolves.toStrictEqual({
      errorCount: 0,
      todayCount: 0,
      totalCount: 0,
      warningCount: 0,
    })
  })
})

describe("insertAuditLogs", () => {
  const row = {
    action: "order.placed",
    actorName: "System",
    actorRole: "system",
    category: "orders",
    createdAt: 1_700_000_000_000,
    id: "log-1",
    severity: "success",
    target: "order-1",
  } as const

  it("skips the write for an empty list", async () => {
    await insertAuditLogs([])

    expect(database.inserts).toStrictEqual([])
  })

  it("converts the epoch timestamp into a date", async () => {
    await insertAuditLogs([row])

    expect(database.inserts).toStrictEqual([
      [
        {
          ...row,
          actorId: undefined,
          createdAt: new Date(1_700_000_000_000),
          detail: undefined,
          ip: undefined,
          metadata: undefined,
          resourceId: undefined,
        },
      ],
    ])
  })
})

describe("deleteAuditLogs", () => {
  it("returns zero and writes nothing for an empty id list", async () => {
    await expect(deleteAuditLogs([])).resolves.toBe(0)
    expect(database.deletes).toStrictEqual([])
  })

  it("deletes the listed ids and reports how many were removed", async () => {
    await expect(deleteAuditLogs(["log-1", "log-2"])).resolves.toBe(2)

    const query = dialect.sqlToQuery(lastDelete())

    expect(query.sql).toBe('"audit_log"."id" in (?, ?)')
    expect(query.params).toStrictEqual(["log-1", "log-2"])
  })
})

const lastDelete = (): SQL => {
  const where = database.deletes.at(-1)

  if (!(where instanceof SQL)) {
    throw new TypeError("No delete was recorded")
  }

  return where
}
