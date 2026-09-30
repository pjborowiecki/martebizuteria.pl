import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  applyAuditFilter: vi.fn(),
  context: {
    activeDateFilter: undefined as { date?: string; operator: string } | undefined,
    activeSeverityFilter: undefined as string | undefined,
  },
  pendingForever: { current: false },
  stats: { errorCount: 60, todayCount: 300, totalCount: 1200, warningCount: 240 },
  statsKey: ["audit-log", "admin", "stats"],
}))

vi.mock("~/src/modules/audit-log/use-cases/get-audit-log-stats", () => ({
  getAuditLogStatsQuery: () => ({
    queryFn: () => (mocked.pendingForever.current ? new Promise(() => {}) : Promise.resolve(mocked.stats)),
    queryKey: mocked.statsKey,
    staleTime: Number.POSITIVE_INFINITY,
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid", () => ({
  useAuditDataGridContext: () => ({
    activeDateFilter: mocked.context.activeDateFilter,
    activeSeverityFilter: mocked.context.activeSeverityFilter,
    applyAuditFilter: mocked.applyAuditFilter,
  }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AuditStats } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-stats"
import { buildAuditTodayCreatedAtFilter } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-today-date-filter"

const renderStats = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (!mocked.pendingForever.current) {
    queryClient.setQueryData(mocked.statsKey, mocked.stats)
  }

  return renderWithProviders(<AuditStats />, { queryClient })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.pendingForever.current = false
  mocked.context.activeDateFilter = undefined
  mocked.context.activeSeverityFilter = undefined
  mocked.stats = { errorCount: 60, todayCount: 300, totalCount: 1200, warningCount: 240 }
})

afterEach(() => {
  cleanup()
})

describe("AuditStats", () => {
  it("renders one card per figure with its translated label", () => {
    renderStats()

    expect(screen.getByText("Total events")).toBeInTheDocument()
    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("Warnings")).toBeInTheDocument()
    expect(screen.getByText("Errors")).toBeInTheDocument()
  })

  it("formats every count for the active locale", () => {
    renderStats()

    expect(screen.getByText("1,200")).toBeInTheDocument()
    expect(screen.getByText("300")).toBeInTheDocument()
    expect(screen.getByText("240")).toBeInTheDocument()
    expect(screen.getByText("60")).toBeInTheDocument()
  })

  it("captions every card except the total with its share of all events", () => {
    renderStats()

    expect(screen.getByText("25% of total")).toBeInTheDocument()
    expect(screen.getByText("20% of total")).toBeInTheDocument()
    expect(screen.getByText("5% of total")).toBeInTheDocument()
    expect(screen.queryByText("100% of total")).not.toBeInTheDocument()
  })

  it("rounds a fractional share to a whole percent", () => {
    mocked.stats = { errorCount: 1, todayCount: 0, totalCount: 3, warningCount: 2 }

    renderStats()

    expect(screen.getByText("33% of total")).toBeInTheDocument()
    expect(screen.getByText("67% of total")).toBeInTheDocument()
  })

  it("omits the share captions while there are no events at all", () => {
    mocked.stats = { errorCount: 0, todayCount: 0, totalCount: 0, warningCount: 0 }

    renderStats()

    expect(screen.queryByText(/of total/u)).not.toBeInTheDocument()
    expect(screen.getAllByText("0")).toHaveLength(4)
  })

  it("disables the cards and shows no figures until the statistics arrive", () => {
    mocked.pendingForever.current = true

    renderStats()

    expect(screen.queryByText("1,200")).not.toBeInTheDocument()
    expect(screen.queryByText(/of total/u)).not.toBeInTheDocument()
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-busy", "true")
      expect(button).toBeDisabled()
    }
  })
})

describe("AuditStats filtering", () => {
  it("filters by severity from the warnings card", async () => {
    renderStats()

    await userEvent.click(screen.getByRole("button", { name: /Warnings/u }))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ severity: "warning" })
  })

  it("filters by severity from the errors card", async () => {
    renderStats()

    await userEvent.click(screen.getByRole("button", { name: /Errors/u }))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ severity: "error" })
  })

  it("clears the severity when the already active card is pressed again", async () => {
    mocked.context.activeSeverityFilter = "error"

    renderStats()

    await userEvent.click(screen.getByRole("button", { name: /Errors/u }))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ severity: undefined })
  })

  it("marks the active severity card as pressed", () => {
    mocked.context.activeSeverityFilter = "warning"

    renderStats()

    expect(screen.getByRole("button", { name: /Warnings/u })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Total events/u })).toHaveAttribute("aria-pressed", "false")
  })

  it("applies today's date filter from the today card", async () => {
    renderStats()

    await userEvent.click(screen.getByRole("button", { name: /Today/u }))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: buildAuditTodayCreatedAtFilter() })
  })

  it("clears the date filter when today is already the active filter", async () => {
    mocked.context.activeDateFilter = buildAuditTodayCreatedAtFilter()

    renderStats()

    expect(screen.getByRole("button", { name: /Today/u })).toHaveAttribute("aria-pressed", "true")

    await userEvent.click(screen.getByRole("button", { name: /Today/u }))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined })
  })

  it("keeps the today card inactive for a filter on another day", () => {
    mocked.context.activeDateFilter = { date: "1999-12-31", operator: "on" }

    renderStats()

    expect(screen.getByRole("button", { name: /Today/u })).toHaveAttribute("aria-pressed", "false")
  })

  it("clears both the date and the severity from the total card", async () => {
    mocked.context.activeSeverityFilter = "error"

    renderStats()

    await userEvent.click(screen.getByRole("button", { name: /Total events/u }))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined, severity: undefined })
  })

  it("marks the total card as active while nothing is filtered", () => {
    renderStats()

    expect(screen.getByRole("button", { name: /Total events/u })).toHaveAttribute("aria-pressed", "true")
  })
})
