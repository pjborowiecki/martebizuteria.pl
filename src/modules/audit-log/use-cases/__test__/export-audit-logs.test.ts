import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { type AdminAuditLogsListParams } from "~/src/modules/audit-log/audit-log.accessors"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"
import { exportAuditLogs } from "~/src/modules/audit-log/use-cases/export-audit-logs"

const stubs = vi.hoisted(() => ({
  getAdminAuditLogsPage: vi.fn<(params: AdminAuditLogsListParams) => Promise<{ rows: unknown[]; total?: number }>>(),
  getRequestSession: vi.fn<() => Promise<{ user: { role: string; twoFactorEnabled?: boolean } } | null>>(),
  recordListExportedAudit: vi.fn<(list: string, rowCount: number, options: { metadata: object }) => void>(),
}))

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("https://marte.test/admin/audit") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))
vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => import("~/src/platform/testing/mocks/display-preferences"))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ getAdminAuditLogsPage: stubs.getAdminAuditLogsPage }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordListExportedAudit: stubs.recordListExportedAudit }))

const CREATED_AT = new Date("2026-10-16T12:30:12.000Z")

const auditRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  action: "order.placed",
  actorId: "admin-1",
  actorName: "Anna Kowalska",
  actorRole: "admin",
  category: "orders",
  createdAt: CREATED_AT,
  detail: null,
  id,
  ip: "203.0.113.7",
  metadata: null,
  resourceId: null,
  severity: "info",
  target: "MRT-2026-00042",
  ...overrides,
})

const NOW = new Date("2026-10-16T12:34:56.000Z")

const requestedParams = () => stubs.getAdminAuditLogsPage.mock.lastCall?.[0]

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } })
  stubs.getAdminAuditLogsPage.mockResolvedValue({ rows: [auditRow("log-1"), auditRow("log-2", { severity: "error" })], total: 2 })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("exportAuditLogs authorization", () => {
  it("turns away a visitor who is not signed in", async () => {
    stubs.getRequestSession.mockResolvedValue(null)

    await expect(exportAuditLogs({ data: {} })).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
    expect(stubs.getAdminAuditLogsPage).not.toHaveBeenCalled()
  })

  it("turns away a customer, who cannot read the audit log", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(exportAuditLogs({ data: {} })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(stubs.getAdminAuditLogsPage).not.toHaveBeenCalled()
    expect(stubs.recordListExportedAudit).not.toHaveBeenCalled()
  })

  it("turns away an admin who has not set up two-factor authentication", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: false } })

    await expect(exportAuditLogs({ data: {} })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(stubs.getAdminAuditLogsPage).not.toHaveBeenCalled()
    expect(stubs.recordListExportedAudit).not.toHaveBeenCalled()
  })
})

describe("exportAuditLogs paging", () => {
  it("reads the first page of the largest size the list allows, up to the moment the export began", async () => {
    await expect(exportAuditLogs({ data: {} })).resolves.toMatchObject({ hasMore: false, until: NOW.getTime() })

    expect(requestedParams()).toStrictEqual({
      category: undefined,
      createdAt: undefined,
      limit: LIST_PAGE_SIZE_MAX,
      offset: 0,
      search: undefined,
      severity: undefined,
      timeZone: "Europe/Warsaw",
      until: NOW,
    })
  })

  it("keeps reading up to the moment the first page fixed, so entries recorded meanwhile do not shift the pages", async () => {
    const until = Date.parse("2026-10-16T12:00:00.000Z")

    await expect(exportAuditLogs({ data: { page: 3, until } })).resolves.toMatchObject({ until })

    expect(requestedParams()).toMatchObject({ limit: LIST_PAGE_SIZE_MAX, offset: 2 * LIST_PAGE_SIZE_MAX, until: new Date(until) })
  })

  it("says more entries follow when a page comes back full", async () => {
    stubs.getAdminAuditLogsPage.mockResolvedValue({
      rows: Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => auditRow(`log-${String(index)}`)),
    })

    await expect(exportAuditLogs({ data: { page: 2 } })).resolves.toMatchObject({ hasMore: true })
  })

  it("applies the category, status, date and search of the list, with the search trimmed", async () => {
    const createdAt = { endDate: "2026-10-16T18:00", operator: "between", startDate: "2026-10-01T08:00" } as const

    await exportAuditLogs({ data: { category: "orders", createdAt, search: "  MRT-2026  ", severity: "error" } })

    expect(requestedParams()).toMatchObject({ category: "orders", createdAt, search: "MRT-2026", severity: "error" })
  })

  it("accepts only the categories, statuses and pages the log has", () => {
    expect(auditLogZodSchemas.adminAuditLogsExportInput.safeParse({ category: "billing" }).success).toBe(false)
    expect(auditLogZodSchemas.adminAuditLogsExportInput.safeParse({ severity: "fatal" }).success).toBe(false)
    expect(auditLogZodSchemas.adminAuditLogsExportInput.safeParse({ page: 0 }).success).toBe(false)
  })
})

describe("exportAuditLogs rows", () => {
  it("returns the entries mapped like the list shows them, in the admin's format locale and time zone", async () => {
    const { items } = await exportAuditLogs({ data: {} })

    expect(items.map(({ id, severity, timestamp }) => ({ id, severity, timestamp }))).toStrictEqual([
      { id: "log-1", severity: "info", timestamp: "16 paź 2026, 14:30:12" },
      { id: "log-2", severity: "error", timestamp: "16 paź 2026, 14:30:12" },
    ])
  })

  it("describes the detail of an entry the way the list does", async () => {
    stubs.getAdminAuditLogsPage.mockResolvedValue({
      rows: [auditRow("log-1", { action: "customer.cart_abandoned", metadata: JSON.stringify({ itemCount: 3 }) })],
      total: 1,
    })

    const {
      items: [row],
    } = await exportAuditLogs({ data: {} })

    expect(row?.detail).toStrictEqual({ kind: "message", message: "cartItemCount", values: { count: 3 } })
  })

  it("records the export once, on its first page, with every row it holds and the filters", async () => {
    stubs.getAdminAuditLogsPage.mockResolvedValue({ rows: [auditRow("log-1")], total: 612 })

    await exportAuditLogs({ data: { search: "anna", severity: "warning" } })

    expect(stubs.recordListExportedAudit).toHaveBeenCalledExactlyOnceWith("auditLogs", 612, {
      metadata: { filters: { search: "anna", severity: "warning" } },
    })
  })

  it("records nothing for the pages after the first", async () => {
    stubs.getAdminAuditLogsPage.mockResolvedValue({ rows: [auditRow("log-251")] })

    await exportAuditLogs({ data: { page: 2, until: NOW.getTime() } })

    expect(stubs.recordListExportedAudit).not.toHaveBeenCalled()
  })
})
