import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type { DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"

interface AuditDatePatch {
  readonly createdAt?: DateTimeColumnFilterValue | undefined
}

interface AuditDateContext {
  readonly activeDateFilter: DateTimeColumnFilterValue | undefined
  readonly applyAuditFilter: (patch?: AuditDatePatch) => void
}

const contextRef = vi.hoisted(() => {
  const applyAuditFilter = vi.fn<(patch?: AuditDatePatch) => void>()
  const initial: AuditDateContext = { activeDateFilter: undefined, applyAuditFilter }

  return { applyAuditFilter, current: initial }
})

vi.mock("~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid", () => ({
  useAuditDataGridContext: () => contextRef.current,
}))

import { AuditDateFilter } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-date-filter"

const TRIGGER_LABEL = "Filter by date range"

const trigger = (): HTMLElement => screen.getByRole("button", { name: TRIGGER_LABEL })

beforeEach(() => {
  vi.clearAllMocks()
  contextRef.current = { activeDateFilter: undefined, applyAuditFilter: contextRef.applyAuditFilter }
})

afterEach(() => {
  cleanup()
})

describe("AuditDateFilter", () => {
  it("labels the closed trigger with the idle range label", () => {
    renderWithProviders(<AuditDateFilter />)

    expect(trigger()).toHaveTextContent(TRIGGER_LABEL)
  })

  it("keeps the range form out of the document until it is opened", () => {
    renderWithProviders(<AuditDateFilter />)

    expect(screen.queryByText("Condition")).not.toBeInTheDocument()
  })

  it("opens a form with the condition picker and the date field", async () => {
    renderWithProviders(<AuditDateFilter />)
    await userEvent.click(trigger())

    expect(screen.getByText("Condition")).toBeInTheDocument()
    expect(screen.getByLabelText("Date")).toBeInTheDocument()
  })

  it("offers every date condition the column filters define", async () => {
    renderWithProviders(<AuditDateFilter />)
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["At", "Before", "After", "Date range"])
  })

  it("cannot be applied while no date has been chosen", async () => {
    renderWithProviders(<AuditDateFilter />)
    await userEvent.click(trigger())

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })

  it("offers no clear action while nothing is filtered", async () => {
    renderWithProviders(<AuditDateFilter />)
    await userEvent.click(trigger())

    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument()
  })

  it("spells the active single-date filter out on the trigger", () => {
    contextRef.current = {
      activeDateFilter: { date: "2026-09-01T08:30", operator: "on" },
      applyAuditFilter: contextRef.applyAuditFilter,
    }
    renderWithProviders(<AuditDateFilter />)

    expect(trigger().textContent).toMatch(/^= Sep \d{1,2}, 2026, \d{1,2}:\d{2}\s?(?:AM|PM)$/u)
  })

  it("spells an active range out as both ends of the range", () => {
    contextRef.current = {
      activeDateFilter: { endDate: "2026-09-07T23:59", operator: "between", startDate: "2026-09-01T00:00" },
      applyAuditFilter: contextRef.applyAuditFilter,
    }
    renderWithProviders(<AuditDateFilter />)

    expect(trigger().textContent).toMatch(/^Sep \d{1,2}, 2026, .+ – Sep \d{1,2}, 2026, .+$/u)
  })

  it("drops the filter when the admin clears an active range", async () => {
    contextRef.current = {
      activeDateFilter: { date: "2026-09-01T08:30", operator: "on" },
      applyAuditFilter: contextRef.applyAuditFilter,
    }
    renderWithProviders(<AuditDateFilter />)
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(contextRef.applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined })
  })

  it("seeds the form from the filter already in force", async () => {
    contextRef.current = {
      activeDateFilter: { date: "2026-09-01T08:30", operator: "on" },
      applyAuditFilter: contextRef.applyAuditFilter,
    }
    renderWithProviders(<AuditDateFilter />)
    await userEvent.click(trigger())

    expect(screen.getByRole("combobox")).toHaveTextContent("At")
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled()
  })
})
