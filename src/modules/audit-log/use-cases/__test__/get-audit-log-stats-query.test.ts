import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({
  stats: vi.fn(() => Promise.resolve({ errorCount: 2, todayCount: 5, totalCount: 41, warningCount: 3 })),
}))

vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => import("~/src/platform/testing/mocks/display-preferences"))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ getAdminAuditLogStats: accessors.stats }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        Promise.resolve(options.data)
          .then((data) => (state.validator === undefined ? data : state.validator(data)))
          .then((data) => handler({ data })),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

import { AUDIT_LOG_QUERY_KEYS, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { getAuditLogStats, getAuditLogStatsQuery } from "~/src/modules/audit-log/use-cases/get-audit-log-stats"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getAuditLogStatsQuery", () => {
  it("keys the stat cards under the shared admin audit stats key and the day they count", () => {
    expect(getAuditLogStatsQuery("2026-10-15").queryKey).toStrictEqual([...AUDIT_LOG_QUERY_KEYS.ADMIN.STATS, "2026-10-15"])
  })

  it("gives a new day a query of its own, so yesterday's counts are not shown after midnight", () => {
    expect(getAuditLogStatsQuery("2026-10-15").queryKey).not.toStrictEqual(getAuditLogStatsQuery("2026-10-14").queryKey)
  })

  it("keeps the counts fresh for the audit window and never refetches on mount or focus", () => {
    const options = getAuditLogStatsQuery("2026-10-15")

    expect(options.staleTime).toBe(AUDIT_LOG_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("counts today's events for the day it is keyed by", async () => {
    const options = getAuditLogStatsQuery("2026-10-15")
    const result = await options.queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: options.queryKey,
      signal: new AbortController().signal,
    })

    expect(accessors.stats).toHaveBeenCalledWith("2026-10-15", "Europe/Warsaw")
    expect(result).toStrictEqual({ errorCount: 2, todayCount: 5, totalCount: 41, warningCount: 3 })
  })
})

describe("getAuditLogStats input validation", () => {
  it("counts the day the request names once it passes the schema", async () => {
    await expect(getAuditLogStats({ data: { today: "2026-10-15" } })).resolves.toMatchObject({ todayCount: 5 })
    expect(accessors.stats).toHaveBeenCalledWith("2026-10-15", "Europe/Warsaw")
  })

  it.each([["2026-10-15T00:00"], ["2026-02-30"], ["15.10.2026"], [""]])("refuses %j as the day to count", async (today) => {
    await expect(getAuditLogStats({ data: { today } })).rejects.toThrow()
    expect(accessors.stats).not.toHaveBeenCalled()
  })
})
