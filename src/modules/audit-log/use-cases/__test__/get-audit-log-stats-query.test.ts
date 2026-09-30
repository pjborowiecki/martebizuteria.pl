import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({
  stats: vi.fn(() => Promise.resolve({ errorCount: 2, todayCount: 5, totalCount: 41, warningCount: 3 })),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ getAdminAuditLogStats: accessors.stats }))
vi.mock("~/src/modules/audit-log/audit-log.utils", () => ({ resolveStartOfToday: () => new Date("2026-09-29T00:00:00.000Z") }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: () => unknown) => () => handler(),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

import { AUDIT_LOG_QUERY_KEYS, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { getAuditLogStatsQuery } from "~/src/modules/audit-log/use-cases/get-audit-log-stats"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getAuditLogStatsQuery", () => {
  it("keys the stat cards under the shared admin audit stats key", () => {
    expect(getAuditLogStatsQuery().queryKey).toStrictEqual(AUDIT_LOG_QUERY_KEYS.ADMIN.STATS)
  })

  it("keeps the counts fresh for the audit window and never refetches on mount or focus", () => {
    const options = getAuditLogStatsQuery()

    expect(options.staleTime).toBe(AUDIT_LOG_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("counts the events from the start of the current day", async () => {
    const result = await getAuditLogStatsQuery().queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: AUDIT_LOG_QUERY_KEYS.ADMIN.STATS,
      signal: new AbortController().signal,
    })

    expect(accessors.stats).toHaveBeenCalledWith(new Date("2026-09-29T00:00:00.000Z"))
    expect(result).toStrictEqual({ errorCount: 2, todayCount: 5, totalCount: 41, warningCount: 3 })
  })
})
