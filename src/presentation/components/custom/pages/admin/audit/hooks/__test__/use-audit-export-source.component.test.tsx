import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

const { exportFn } = vi.hoisted(() => ({ exportFn: vi.fn<(input: unknown) => Promise<unknown>>() }))

vi.mock("~/src/modules/audit-log/use-cases/export-audit-logs", () => ({
  exportAuditLogs: ({ data }: Readonly<{ data: unknown }>) => exportFn(data),
}))

import { useAuditExportSource } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-export-source"

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const sourceFor = (input: Parameters<typeof useAuditExportSource>[0]) =>
  renderHook(() => useAuditExportSource(input), { wrapper: Wrapper }).result.current

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("useAuditExportSource", () => {
  it("names the list and its title for the export", () => {
    expect(sourceFor({})).toMatchObject({ filters: [], list: "audit-log", title: "Audit Log" })
  })

  it("describes the category and the status the admin narrowed the log to", () => {
    expect(sourceFor({ category: "orders", severity: "warning" }).filters).toStrictEqual([
      { label: "Category", value: "Orders" },
      { label: "Status", value: "Warning" },
    ])
  })

  it("describes a single-day timestamp filter in words", () => {
    expect(sourceFor({ createdAt: { date: "2026-10-01", operator: "on" } }).filters).toStrictEqual([
      { label: "Timestamp", value: "on Oct 1, 2026" },
    ])
  })

  it("describes a timestamp range with its times", () => {
    const createdAt = { endDate: "2026-10-02T18:00", operator: "between", startDate: "2026-10-01T08:30" } as const

    expect(sourceFor({ createdAt }).filters).toStrictEqual([
      { label: "Timestamp", value: "from Oct 1, 2026, 8:30 AM to Oct 2, 2026, 6:00 PM" },
    ])
  })

  it("leaves out a timestamp filter that names no date", () => {
    expect(sourceFor({ createdAt: { operator: "after" } }).filters).toStrictEqual([])
  })

  it("reads the export page by page, holding every page to the moment the first one fixed", async () => {
    exportFn
      .mockResolvedValueOnce({ hasMore: true, items: [{ id: "log-1" }, { id: "log-2" }], until: 1_790_000_000_000 })
      .mockResolvedValueOnce({ hasMore: false, items: [{ id: "log-3" }], until: 1_790_000_000_000 })
    const input = { category: "auth", search: "anna", severity: "error" } as const

    await expect(sourceFor(input).loadRows?.()).resolves.toStrictEqual([{ id: "log-1" }, { id: "log-2" }, { id: "log-3" }])
    expect(exportFn.mock.calls).toStrictEqual([
      [{ ...input, page: 1, until: undefined }],
      [{ ...input, page: 2, until: 1_790_000_000_000 }],
    ])
  })

  it("names the search the list sent, for the export to describe", () => {
    expect(sourceFor({ search: "anna" }).search).toBe("anna")
  })
})
