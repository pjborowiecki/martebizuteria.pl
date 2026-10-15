import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_TABLE_COLUMN_ID } from "~/src/modules/audit-log/audit-log.constants"

const server = vi.hoisted(() => ({
  list: vi.fn<(input: unknown) => Promise<unknown>>(),
  stats: vi.fn<(today: string) => Promise<unknown>>(),
}))

vi.mock("~/src/modules/audit-log/use-cases/list-audit-logs", () => ({
  listAuditLogs: ({ data }: Readonly<{ data: unknown }>) => server.list(data),
  listAuditLogsQuery: (input: unknown) => ({ queryKey: ["admin", "audit-log", "page", input] }),
}))
vi.mock("~/src/modules/audit-log/use-cases/get-audit-log-stats", () => ({
  getAuditLogStatsQuery: (today: string) => ({
    queryFn: () => server.stats(today),
    queryKey: ["admin", "audit-log", "stats", today],
    staleTime: Number.POSITIVE_INFINITY,
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-columns", () => ({
  useAuditColumns: () => [{ accessorKey: "action", header: "Event", id: AUDIT_LOG_TABLE_COLUMN_ID.action }],
}))

import { AuditDateFilter } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-date-filter"
import { AuditSeverityFilter } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-filters"
import { AuditStats } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-stats"
import { useAuditDataGrid } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid"
import { auditDataGrid } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid"

const PAST_MIDNIGHT_IN_POLAND = new Date("2026-10-14T22:30:00.000Z")

const TODAY_FILTER = { date: "2026-10-15", operator: "on" }

const STATS = { errorCount: 2, todayCount: 9, totalCount: 100, warningCount: 6 }

const CARD_LABELS = ["Total events", "Today", "Warnings", "Errors"]

const AuditPageHarness = (): JSX.Element => {
  const grid = useAuditDataGrid()

  return (
    <auditDataGrid.Provider value={grid}>
      <AuditStats />
      <AuditSeverityFilter />
      <AuditDateFilter />
    </auditDataGrid.Provider>
  )
}

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return renderWithProviders(<AuditPageHarness />, { queryClient })
}

const card = (label: string): HTMLElement => screen.getByRole("button", { name: (name) => name.startsWith(label) })

const pressedCards = (): string[] => CARD_LABELS.filter((label) => card(label).getAttribute("aria-pressed") === "true")

const dateTrigger = (): HTMLElement => screen.getByRole("button", { name: "Filter by date range" })

const lastListRequest = () => server.list.mock.calls.at(-1)?.[0]

const expectListRequest = async (filters: Readonly<{ createdAt: unknown; severity: unknown }>): Promise<void> => {
  await waitFor(() => {
    expect(lastListRequest()).toStrictEqual({
      category: undefined,
      page: 1,
      pageSize: ADMIN_AUDIT_LOG_PAGE_SIZE,
      search: undefined,
      ...filters,
    })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.useFakeTimers({ now: PAST_MIDNIGHT_IN_POLAND, toFake: ["Date"] })
  server.list.mockResolvedValue({ hasMore: false, items: [], limit: ADMIN_AUDIT_LOG_PAGE_SIZE, offset: 0, total: 0 })
  server.stats.mockResolvedValue(STATS)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("the audit stat cards just after midnight in Poland", () => {
  it("count and filter the same day in Poland, though it is still the day before in UTC", async () => {
    renderPage()
    await screen.findByText("9")

    await userEvent.click(card("Today"))

    expect(server.stats).toHaveBeenCalledWith("2026-10-15")
    await expectListRequest({ createdAt: TODAY_FILTER, severity: undefined })
    expect(pressedCards()).toStrictEqual(["Today"])
    expect(dateTrigger()).toHaveTextContent("= Oct 15, 2026")
  })
})
