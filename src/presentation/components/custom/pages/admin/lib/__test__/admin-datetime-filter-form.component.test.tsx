import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { type DateTimeFilterDraft, emptyDateTimeFilterDraft } from "~/src/modules/_core/utils/datetime-column-filter"

import {
  AdminDateTimeFilterForm,
  type AdminDateTimeFilterFormLabels,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-datetime-filter-form"

const LABELS: AdminDateTimeFilterFormLabels = {
  clearDate: "Clear date",
  date: "Date",
  endDate: "End date",
  endTime: "End time",
  operator: "Comparison",
  placeholder: "Any date",
  startDate: "Start date",
  startTime: "Start time",
  time: "Time",
  timePlaceholder: "--:--",
  today: "Today",
}

const OPERATOR_OPTIONS = [
  { label: "On", value: DATE_COLUMN_FILTER_OPERATOR.ON },
  { label: "Between", value: DATE_COLUMN_FILTER_OPERATOR.BETWEEN },
]

const TODAY_ISO = "2024-06-20"

const draft = (overrides: Partial<DateTimeFilterDraft> = {}): DateTimeFilterDraft => ({
  ...emptyDateTimeFilterDraft(),
  ...overrides,
})

const renderForm = (dateTimeDraft: DateTimeFilterDraft = draft()) => {
  const callbacks = {
    onDateChange: vi.fn(),
    onEndDateChange: vi.fn(),
    onEndTimeChange: vi.fn(),
    onOperatorChange: vi.fn(),
    onStartDateChange: vi.fn(),
    onStartTimeChange: vi.fn(),
    onTimeChange: vi.fn(),
  }
  renderWithProviders(
    <AdminDateTimeFilterForm
      draft={dateTimeDraft}
      labels={LABELS}
      operatorOptions={OPERATOR_OPTIONS}
      todayIso={TODAY_ISO}
      {...callbacks}
    />,
  )

  return callbacks
}

afterEach(() => {
  cleanup()
})

describe("AdminDateTimeFilterForm in single moment mode", () => {
  it("pairs one date picker with one time picker", () => {
    renderForm()

    expect(screen.getByRole("button", { name: "Date" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Time" })).toBeInTheDocument()
  })

  it("shows both placeholders while nothing is chosen", () => {
    renderForm()

    expect(screen.getByRole("button", { name: "Date" }).textContent).toBe("Any date")
    expect(screen.getByRole("button", { name: "Time" }).textContent).toBe("--:--")
  })

  it("shows the chosen moment on both pickers", () => {
    renderForm(draft({ date: "2024-06-10", time: "08:30" }))

    expect(screen.getByRole("button", { name: "Date" }).textContent).toBe("6/10/24")
    expect(screen.getByRole("button", { name: "Time" }).textContent).toBe("08:30")
  })

  it("reports today's date from the calendar shortcut", async () => {
    const { onDateChange } = renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Date" }))
    await userEvent.click(screen.getByRole("button", { name: "Today" }))

    expect(onDateChange).toHaveBeenCalledWith(TODAY_ISO)
  })

  it("splits the chosen time into hour and minute controls", async () => {
    renderForm(draft({ time: "08:30" }))

    await userEvent.click(screen.getByRole("button", { name: "Time" }))

    expect(screen.getAllByRole("combobox")).toHaveLength(3)
  })

  it("keeps the time panel closed until the time picker is pressed", () => {
    renderForm()

    expect(screen.getByRole("button", { name: "Time" })).toHaveAttribute("aria-expanded", "false")
  })

  it("offers no range fields", () => {
    renderForm()

    expect(screen.queryByRole("button", { name: "Start date" })).toBeNull()
    expect(screen.queryByRole("button", { name: "End time" })).toBeNull()
  })
})

describe("AdminDateTimeFilterForm in range mode", () => {
  const rangeDraft = draft({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN })

  it("pairs a date and a time picker for each end of the range", () => {
    renderForm(rangeDraft)

    expect(screen.getByRole("button", { name: "Start date" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Start time" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "End date" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "End time" })).toBeInTheDocument()
  })

  it("drops the single moment fields", () => {
    renderForm(rangeDraft)

    expect(screen.queryByRole("button", { name: "Date" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Time" })).toBeNull()
  })

  it("shows each end of the range on its own pair of pickers", () => {
    renderForm(
      draft({
        endDate: "2024-06-18",
        endTime: "18:45",
        operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
        startDate: "2024-06-01",
        startTime: "06:15",
      }),
    )

    expect(screen.getByRole("button", { name: "Start date" }).textContent).toBe("6/1/24")
    expect(screen.getByRole("button", { name: "Start time" }).textContent).toBe("06:15")
    expect(screen.getByRole("button", { name: "End date" }).textContent).toBe("6/18/24")
    expect(screen.getByRole("button", { name: "End time" }).textContent).toBe("18:45")
  })

  it("reports the start date without touching the end date", async () => {
    const { onEndDateChange, onStartDateChange } = renderForm(rangeDraft)

    await userEvent.click(screen.getByRole("button", { name: "Start date" }))
    await userEvent.click(screen.getByRole("button", { name: "Today" }))

    expect(onStartDateChange).toHaveBeenCalledWith(TODAY_ISO)
    expect(onEndDateChange).not.toHaveBeenCalled()
  })

  it("opens the start calendar on the month of the chosen start date", async () => {
    renderForm(draft({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-06-05" }))

    await userEvent.click(screen.getByRole("button", { name: "Start date" }))

    expect(screen.getByRole("grid", { name: "June 2024" })).toBeInTheDocument()
  })

  it("falls back to midnight on both time controls when no time is chosen", async () => {
    renderForm(rangeDraft)

    await userEvent.click(screen.getByRole("button", { name: "Start time" }))

    expect(screen.getByRole("button", { name: "Start time" }).textContent).toBe("--:--")
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(1)
  })
})
