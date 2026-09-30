import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import {
  AdminDateFilterForm,
  type AdminDateFilterFormLabels,
  type DateFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-date-filter-form"

const LABELS: AdminDateFilterFormLabels = {
  clearDate: "Clear date",
  date: "Date",
  endDate: "End date",
  operator: "Comparison",
  placeholder: "Any date",
  startDate: "Start date",
  today: "Today",
}

const OPERATOR_OPTIONS = [
  { label: "On", value: DATE_COLUMN_FILTER_OPERATOR.ON },
  { label: "Between", value: DATE_COLUMN_FILTER_OPERATOR.BETWEEN },
]

const TODAY_ISO = "2024-06-20"

const draft = (overrides: Partial<DateFilterDraft> = {}): DateFilterDraft => ({
  date: "",
  endDate: "",
  operator: DATE_COLUMN_FILTER_OPERATOR.ON,
  startDate: "",
  ...overrides,
})

const renderForm = (dateDraft: DateFilterDraft = draft()) => {
  const callbacks = {
    onDateChange: vi.fn(),
    onEndDateChange: vi.fn(),
    onOperatorChange: vi.fn(),
    onStartDateChange: vi.fn(),
  }
  renderWithProviders(
    <AdminDateFilterForm draft={dateDraft} labels={LABELS} operatorOptions={OPERATOR_OPTIONS} todayIso={TODAY_ISO} {...callbacks} />,
  )

  return callbacks
}

afterEach(() => {
  cleanup()
})

describe("AdminDateFilterForm in single date mode", () => {
  it("offers one date picker", () => {
    renderForm()

    expect(screen.getByRole("button", { name: "Date" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Start date" })).toBeNull()
  })

  it("shows the placeholder while no date is chosen", () => {
    renderForm()

    expect(screen.getByRole("button", { name: "Date" }).textContent).toBe("Any date")
  })

  it("shows the chosen date in the active locale's short format", () => {
    renderForm(draft({ date: "2024-06-10" }))

    expect(screen.getByRole("button", { name: "Date" }).textContent).toBe("6/10/24")
  })

  it("keeps the calendar closed until the picker is pressed", () => {
    renderForm()

    expect(screen.getByRole("button", { name: "Date" })).toHaveAttribute("aria-expanded", "false")
  })

  it("reports today's date when the calendar's today shortcut is pressed", async () => {
    const { onDateChange } = renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Date" }))
    await userEvent.click(screen.getByRole("button", { name: "Today" }))

    expect(onDateChange).toHaveBeenCalledWith(TODAY_ISO)
  })

  it("cannot clear a date that was never chosen", async () => {
    renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Date" }))

    expect(screen.getByRole("button", { name: "Clear date" })).toBeDisabled()
  })

  it("reports an empty date when a chosen date is cleared", async () => {
    const { onDateChange } = renderForm(draft({ date: "2024-06-10" }))

    await userEvent.click(screen.getByRole("button", { name: "Date" }))
    await userEvent.click(screen.getByRole("button", { name: "Clear date" }))

    expect(onDateChange).toHaveBeenCalledWith("")
  })
})

describe("AdminDateFilterForm in range mode", () => {
  const rangeDraft = draft({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN })

  it("offers a start and an end picker instead of a single date", () => {
    renderForm(rangeDraft)

    expect(screen.getByRole("button", { name: "Start date" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "End date" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Date" })).toBeNull()
  })

  it("reports the start of the range separately from the end", async () => {
    const { onEndDateChange, onStartDateChange } = renderForm(rangeDraft)

    await userEvent.click(screen.getByRole("button", { name: "Start date" }))
    await userEvent.click(screen.getByRole("button", { name: "Today" }))

    expect(onStartDateChange).toHaveBeenCalledWith(TODAY_ISO)
    expect(onEndDateChange).not.toHaveBeenCalled()
  })

  it("shows both endpoints of an existing range", () => {
    renderForm(draft({ endDate: "2024-06-18", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-06-01" }))

    expect(screen.getByRole("button", { name: "Start date" }).textContent).toBe("6/1/24")
    expect(screen.getByRole("button", { name: "End date" }).textContent).toBe("6/18/24")
  })

  it("opens the calendar on the month of the chosen start date", async () => {
    renderForm(draft({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-06-05" }))

    await userEvent.click(screen.getByRole("button", { name: "Start date" }))

    expect(screen.getByRole("grid", { name: "June 2024" })).toBeInTheDocument()
  })

  it("offers the range pickers independently, so opening one leaves the other closed", async () => {
    renderForm(draft({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN }))

    await userEvent.click(screen.getByRole("button", { name: "Start date" }))

    expect(screen.getByRole("button", { name: "Start date" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "End date" })).toHaveAttribute("aria-expanded", "false")
  })
})
