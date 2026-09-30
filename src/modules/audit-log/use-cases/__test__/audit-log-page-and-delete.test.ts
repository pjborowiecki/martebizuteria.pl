import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_MUTATION_KEYS, AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"

import { deleteAuditLogs, deleteAuditLogsMutation } from "../delete-audit-logs"
import { listAuditLogs, listAuditLogsQuery } from "../list-audit-logs"

const accessors = vi.hoisted(() => ({
  deleteAuditLogs: vi.fn((ids: readonly string[]) => Promise.resolve(ids.length)),
  page: vi.fn((params: { limit: number; offset: number }) =>
    Promise.resolve<{ rows: readonly { id: string }[]; total?: number | undefined }>({ rows: [], total: params.offset }),
  ),
}))

const publish = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: publish,
}))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({
  deleteAuditLogs: accessors.deleteAuditLogs,
  getAdminAuditLogsPage: accessors.page,
}))
vi.mock("~/src/modules/audit-log/audit-log.utils", () => ({
  resolveStartOfToday: () => new Date("2026-09-27T00:00:00Z"),
  toAdminAuditListItem: (row: { id: string }) => ({ ...row, mapped: true }),
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) => handler({ data: options?.data }),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const rowsOf = (count: number): readonly { id: string }[] => Array.from({ length: count }, (_, index) => ({ id: `log-${index}` }))

describe("listAuditLogs pagination shape", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("defaults to the first page and the admin page size", async () => {
    accessors.page.mockResolvedValue({ rows: [], total: 0 })

    await listAuditLogs({ data: {} })

    expect(accessors.page).toHaveBeenCalledWith(expect.objectContaining({ limit: ADMIN_AUDIT_LOG_PAGE_SIZE, offset: 0, search: undefined }))
  })

  it("clamps a page below the first page instead of producing a negative offset", async () => {
    accessors.page.mockResolvedValue({ rows: [], total: 0 })

    await listAuditLogs({ data: { page: -4, pageSize: 25 } })

    expect(accessors.page).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 0 }))
  })

  it("omits the total and infers hasMore from a full page when the accessor reports no count", async () => {
    accessors.page.mockResolvedValue({ rows: rowsOf(2), total: undefined })

    const result = await listAuditLogs({ data: { page: 2, pageSize: 2 } })

    expect(result).toStrictEqual({
      hasMore: true,
      items: [
        { id: "log-0", mapped: true },
        { id: "log-1", mapped: true },
      ],
      limit: 2,
      offset: 2,
    })
  })

  it("reports no further pages for a short page when the accessor reports no count", async () => {
    accessors.page.mockResolvedValue({ rows: rowsOf(1), total: undefined })

    const result = await listAuditLogs({ data: { pageSize: 2 } })

    expect(result).toMatchObject({ hasMore: false, limit: 2, offset: 0 })
    expect(result.total).toBeUndefined()
  })

  it("derives hasMore from the reported total when one is available", async () => {
    accessors.page.mockResolvedValue({ rows: rowsOf(2), total: 5 })

    await expect(listAuditLogs({ data: { page: 2, pageSize: 2 } })).resolves.toMatchObject({ hasMore: true, offset: 2, total: 5 })

    accessors.page.mockResolvedValue({ rows: rowsOf(2), total: 4 })

    await expect(listAuditLogs({ data: { page: 2, pageSize: 2 } })).resolves.toMatchObject({ hasMore: false, total: 4 })
  })

  it("forwards the severity, category and date filters to the accessor", async () => {
    accessors.page.mockResolvedValue({ rows: [], total: 0 })

    const createdAt = { date: "2026-09-01", operator: "on" } as const

    await listAuditLogs({ data: { category: "orders", createdAt, severity: "error" } })

    expect(accessors.page).toHaveBeenCalledWith(expect.objectContaining({ category: "orders", createdAt, severity: "error" }))
  })

  it("keys the query by the page namespace and the request input", () => {
    const input = { page: 3 }

    expect(listAuditLogsQuery(input).queryKey).toStrictEqual([...AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, input])
  })
})

describe("deleteAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the deleted count and invalidates the admin page and stats caches", async () => {
    const result = await deleteAuditLogs({ data: ["log-1", "log-2"] })

    expect(accessors.deleteAuditLogs).toHaveBeenCalledWith(["log-1", "log-2"])
    expect(result).toStrictEqual({ deleted: 2, ok: true })
    expect(publish).toHaveBeenCalledWith({
      admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS],
    })
  })

  it("exposes a stable delete mutation key", () => {
    expect(deleteAuditLogsMutation.mutationKey).toStrictEqual(AUDIT_LOG_MUTATION_KEYS.DELETE)
  })
})
