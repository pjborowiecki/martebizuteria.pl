import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fetchAdminAuditLogStatsFn } from "../get-audit-log-stats"
import { fetchAdminAuditLogsPageFn } from "../list-audit-logs"

const access = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  list: vi.fn(() => Promise.resolve({ rows: [], total: 0 })),
  stats: vi.fn(() => Promise.resolve({ errorCount: 0, todayCount: 0, totalCount: 0, warningCount: 0 })),
}))

vi.mock("~/src/integrations/better-auth/auth.assertions", () => ({ assertAdmin: access.assertAdmin }))
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
      validator: () => builder,
    }
    return builder
  },
}))

describe("audit read authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.assertAdmin.mockResolvedValue({ id: "admin" })
  })

  it("rejects unauthorized audit listings before querying the database", async () => {
    access.assertAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(fetchAdminAuditLogsPageFn({ data: {} })).rejects.toThrow("UNAUTHORIZED")

    expect(access.list).not.toHaveBeenCalled()
    expect(access.stats).not.toHaveBeenCalled()
  })

  it("rejects unauthorized audit statistics before querying the database", async () => {
    access.assertAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(fetchAdminAuditLogStatsFn()).rejects.toThrow("UNAUTHORIZED")

    expect(access.list).not.toHaveBeenCalled()
    expect(access.stats).not.toHaveBeenCalled()
  })

  it("preserves pagination and search normalization for authorized audit listings", async () => {
    const result = await fetchAdminAuditLogsPageFn({ data: { page: 2, pageSize: 10, search: "  account  " } })

    expect(access.assertAdmin).toHaveBeenCalledTimes(1)
    expect(access.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 10, search: "account" }))
    expect(result).toStrictEqual({ hasMore: false, items: [], limit: 10, offset: 10, total: 0 })
  })

  it("returns statistics for authorized administrators", async () => {
    const result = await fetchAdminAuditLogStatsFn()

    expect(access.assertAdmin).toHaveBeenCalledTimes(1)
    expect(access.stats).toHaveBeenCalledWith(new Date("2026-09-20T00:00:00Z"))
    expect(result).toStrictEqual({ errorCount: 0, todayCount: 0, totalCount: 0, warningCount: 0 })
  })
})
