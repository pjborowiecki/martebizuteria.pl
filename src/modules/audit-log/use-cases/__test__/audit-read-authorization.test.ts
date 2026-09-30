import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getAuditLogStats } from "../get-audit-log-stats"
import { listAuditLogs } from "../list-audit-logs"

const access = vi.hoisted(() => ({
  list: vi.fn(() => Promise.resolve({ rows: [], total: 0 })),
  stats: vi.fn(() => Promise.resolve({ errorCount: 0, todayCount: 0, totalCount: 0, warningCount: 0 })),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({
  getAdminAuditLogStats: access.stats,
  getAdminAuditLogsPage: access.list,
}))
vi.mock("~/src/modules/audit-log/audit-log.utils", () => ({
  resolveStartOfToday: () => new Date("2026-09-20T00:00:00Z"),
  toAdminAuditListItem: (row: unknown) => row,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: unknown) => handler,
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

describe("audit log admin reads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("preserves pagination and search normalization for audit listings", async () => {
    const result = await listAuditLogs({ data: { page: 2, pageSize: 10, search: "  account  " } })

    expect(access.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 10, search: "account" }))
    expect(result).toStrictEqual({ hasMore: false, items: [], limit: 10, offset: 10, total: 0 })
  })

  it("reports an empty first page as having no more rows", async () => {
    const result = await listAuditLogs({ data: {} })

    expect(access.list).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }))
    expect(result).toMatchObject({ hasMore: false, items: [], total: 0 })
  })

  it("counts audit statistics from the start of the current day", async () => {
    const result = await getAuditLogStats()

    expect(access.stats).toHaveBeenCalledWith(new Date("2026-09-20T00:00:00Z"))
    expect(result).toStrictEqual({ errorCount: 0, todayCount: 0, totalCount: 0, warningCount: 0 })
  })
})
