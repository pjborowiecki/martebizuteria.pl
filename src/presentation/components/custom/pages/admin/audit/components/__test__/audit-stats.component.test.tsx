import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, screen, within } from "@testing-library/react"
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
  statsDays: [] as string[],
  statsKey: ["audit-log", "admin", "stats"],
}))

vi.mock("~/src/modules/audit-log/use-cases/get-audit-log-stats", () => ({
  getAuditLogStatsQuery: (today: string) => {
    mocked.statsDays.push(today)

    return {
      queryFn: () => (mocked.pendingForever.current ? new Promise(() => {}) : Promise.resolve(mocked.stats)),
      queryKey: [...mocked.statsKey, today],
      staleTime: Number.POSITIVE_INFINITY,
    }
  },
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

const PAST_MIDNIGHT_IN_POLAND = new Date("2026-10-14T22:30:00.000Z")

const TODAY_IN_POLAND = "2026-10-15"

const TODAY_FILTER = { date: TODAY_IN_POLAND, operator: "on" }

const renderStats = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (!mocked.pendingForever.current) {
    queryClient.setQueryData([...mocked.statsKey, TODAY_IN_POLAND], mocked.stats)
  }

  return renderWithProviders(<AuditStats />, { queryClient })
}

const card = (name: RegExp): HTMLElement => screen.getByRole("button", { name })

const CARD_LABELS = ["Total events", "Today", "Warnings", "Errors"]

const pressedCards = (): string[] =>
  CARD_LABELS.filter(
    (label) => screen.getByRole("button", { name: (name) => name.startsWith(label) }).getAttribute("aria-pressed") === "true",
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: PAST_MIDNIGHT_IN_POLAND, toFake: ["Date"] })
  mocked.pendingForever.current = false
  mocked.context.activeDateFilter = undefined
  mocked.context.activeSeverityFilter = undefined
  mocked.stats = { errorCount: 60, todayCount: 300, totalCount: 1200, warningCount: 240 }
  mocked.statsDays = []
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("AuditStats", () => {
  it("renders one card per figure with its translated label", () => {
    renderStats()

    expect(screen.getByText("Total events")).toBeInTheDocument()
    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("Warnings")).toBeInTheDocument()
    expect(screen.getByText("Errors")).toBeInTheDocument()
  })

  it("asks for the counts of the day it is in Poland, though it is still the day before in UTC", () => {
    renderStats()

    expect(mocked.statsDays).toContain(TODAY_IN_POLAND)
    expect(mocked.statsDays).not.toContain("2026-10-14")
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

  it("shows no figures until the statistics arrive but still lets every card filter", async () => {
    mocked.pendingForever.current = true

    renderStats()

    expect(screen.queryByText("1,200")).not.toBeInTheDocument()
    expect(screen.queryByText(/of total/u)).not.toBeInTheDocument()
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-busy", "true")
      expect(button).toBeEnabled()
    }

    await userEvent.click(card(/Today/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: TODAY_FILTER, severity: undefined })
  })
})

describe("AuditStats filtering", () => {
  it("shows only warnings from the warnings card, dropping a date filter another card left", async () => {
    mocked.context.activeDateFilter = TODAY_FILTER

    renderStats()

    await userEvent.click(card(/Warnings/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined, severity: "warning" })
  })

  it("shows only errors from the errors card", async () => {
    renderStats()

    await userEvent.click(card(/Errors/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined, severity: "error" })
  })

  it("shows every event again when the pressed severity card is pressed a second time", async () => {
    mocked.context.activeSeverityFilter = "error"

    renderStats()

    await userEvent.click(card(/Errors/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined, severity: undefined })
  })

  it("marks the active severity card as the only pressed one", () => {
    mocked.context.activeSeverityFilter = "warning"

    renderStats()

    expect(pressedCards()).toStrictEqual(["Warnings"])
  })

  it("filters on the day it is in Poland from the today card, dropping a severity another card left", async () => {
    mocked.context.activeSeverityFilter = "warning"

    renderStats()

    await userEvent.click(card(/Today/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: TODAY_FILTER, severity: undefined })
  })

  it("works out the day when the card is pressed, not when the page was drawn", async () => {
    renderStats()
    vi.setSystemTime(new Date("2026-10-15T22:05:00.000Z"))

    await userEvent.click(card(/Today/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: { date: "2026-10-16", operator: "on" }, severity: undefined })
  })

  it("shows every event again when today is already the active filter", async () => {
    mocked.context.activeDateFilter = TODAY_FILTER

    renderStats()

    expect(pressedCards()).toStrictEqual(["Today"])

    await userEvent.click(card(/Today/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined, severity: undefined })
  })

  it("presses no card while today's warnings are shown, since no card counts them", () => {
    mocked.context.activeDateFilter = TODAY_FILTER
    mocked.context.activeSeverityFilter = "warning"

    renderStats()

    expect(pressedCards()).toStrictEqual([])
  })

  it.each([
    ["another day", { date: "1999-12-31", operator: "on" }],
    ["the first minute of today", { date: `${TODAY_IN_POLAND}T00:00`, operator: "on" }],
    ["yesterday in UTC", { date: "2026-10-14", operator: "on" }],
  ])("presses neither the today nor the total card for %s", (_label, filter) => {
    mocked.context.activeDateFilter = filter

    renderStats()

    expect(pressedCards()).toStrictEqual([])
  })

  it("clears both the date and the severity from the total card", async () => {
    mocked.context.activeSeverityFilter = "error"

    renderStats()

    await userEvent.click(card(/Total events/u))

    expect(mocked.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined, severity: undefined })
  })

  it("marks the total card as the only pressed one while nothing is filtered", () => {
    renderStats()

    expect(pressedCards()).toStrictEqual(["Total events"])
  })
})

describe("AuditStats at midnight in Poland", () => {
  it("counts the new day and lets go of the card pressed for the old one while nothing else happens", () => {
    vi.useFakeTimers({ now: new Date("2026-10-14T21:59:00.000Z"), toFake: ["Date", "setTimeout", "clearTimeout"] })
    mocked.context.activeDateFilter = { date: "2026-10-14", operator: "on" }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData([...mocked.statsKey, "2026-10-14"], { ...mocked.stats, todayCount: 9 })
    queryClient.setQueryData([...mocked.statsKey, TODAY_IN_POLAND], { ...mocked.stats, todayCount: 0 })
    renderWithProviders(<AuditStats />, { queryClient })

    expect(pressedCards()).toStrictEqual(["Today"])
    expect(within(card(/Today/u)).getByText("9")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(MS_PER_MINUTE)
    })

    expect(mocked.statsDays).toContain(TODAY_IN_POLAND)
    expect(pressedCards()).toStrictEqual([])
    expect(within(card(/Today/u)).getByText("0")).toBeInTheDocument()
  })
})

const MS_PER_MINUTE = 60_000
