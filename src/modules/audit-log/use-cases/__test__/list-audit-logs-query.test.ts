import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({
  page: vi.fn(() => Promise.resolve({ rows: [{ id: "log-1" }], total: 1 })),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ getAdminAuditLogsPage: accessors.page }))
vi.mock("~/src/modules/audit-log/audit-log.utils", () => ({ toAdminAuditListItem: (row: { id: string }) => ({ ...row, mapped: true }) }))
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

import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_QUERY_KEYS, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { listAuditLogs, listAuditLogsQuery } from "~/src/modules/audit-log/use-cases/list-audit-logs"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("listAuditLogs input validation", () => {
  it("reads the page the admin asked for once the request passes the schema", async () => {
    await expect(listAuditLogs({ data: { category: "orders", page: 3, pageSize: 10, severity: "error" } })).resolves.toStrictEqual({
      hasMore: false,
      items: [{ id: "log-1", mapped: true }],
      limit: 10,
      offset: 20,
      total: 1,
    })
    expect(accessors.page).toHaveBeenCalledWith(expect.objectContaining({ category: "orders", limit: 10, offset: 20, severity: "error" }))
  })

  it("falls back to the admin page size when the request names none", async () => {
    await listAuditLogs({ data: {} })

    expect(accessors.page).toHaveBeenCalledWith(expect.objectContaining({ limit: ADMIN_AUDIT_LOG_PAGE_SIZE, offset: 0 }))
  })

  it("refuses a page before the first one", async () => {
    await expect(listAuditLogs({ data: { page: -4 } })).rejects.toThrow()
    expect(accessors.page).not.toHaveBeenCalled()
  })

  it("refuses a fractional page size", async () => {
    await expect(listAuditLogs({ data: { pageSize: 12.5 } })).rejects.toThrow()
    expect(accessors.page).not.toHaveBeenCalled()
  })

  it("refuses a page size below a single row", async () => {
    await expect(listAuditLogs({ data: { pageSize: 0 } })).rejects.toThrow()
    expect(accessors.page).not.toHaveBeenCalled()
  })
})

describe("listAuditLogsQuery", () => {
  it("fetches the page named in its own key", async () => {
    const input = { page: 2, pageSize: 5 }
    const options = listAuditLogsQuery(input)

    const result = await options.queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: [...AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, input],
      signal: new AbortController().signal,
    })

    expect(accessors.page).toHaveBeenCalledWith(expect.objectContaining({ limit: 5, offset: 5 }))
    expect(result).toStrictEqual({ hasMore: false, items: [{ id: "log-1", mapped: true }], limit: 5, offset: 5, total: 1 })
  })

  it("keeps the page fresh for the audit window without refetching on mount or focus", () => {
    const options = listAuditLogsQuery({ page: 1 })

    expect(options.staleTime).toBe(AUDIT_LOG_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})
