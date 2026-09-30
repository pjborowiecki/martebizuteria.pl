import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { formatDateToIsoDateLocal } from "~/src/modules/_core/utils/iso-date"

import {
  DataGridHarness,
  type HarnessRow,
  stubResizeObserver,
} from "~/src/presentation/components/custom/datagrid/components/__test__/data-grid-harness"
import {
  AdminDateColumnFilter,
  type AdminDateColumnFilterLabels,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-date-column-filter"

const LABELS: AdminDateColumnFilterLabels = {
  apply: "Apply",
  clear: "Clear",
  clearDate: "Clear date",
  date: "Date",
  endDate: "End date",
  operator: "Comparison",
  operatorAfter: "After",
  operatorBefore: "Before",
  operatorBetween: "Between",
  operatorOn: "On",
  placeholder: "Any date",
  startDate: "Start date",
  today: "Today",
}

const FILTER_VALUE_TEST_ID = "created-filter-value"

const TODAY_ISO = formatDateToIsoDateLocal(new Date())

const FilterHarness = (): JSX.Element => (
  <DataGridHarness>
    {(table) => (
      <>
        <AdminDateColumnFilter<HarnessRow>
          ariaLabel="Filter by created date"
          columnId="title"
          label="Created"
          labels={LABELS}
          table={table}
        />
        <p data-testid={FILTER_VALUE_TEST_ID}>{JSON.stringify(table.getColumn("title")?.getFilterValue() ?? null)}</p>
      </>
    )}
  </DataGridHarness>
)

const filterValue = (): string => screen.getByTestId(FILTER_VALUE_TEST_ID).textContent

const trigger = (): HTMLElement => screen.getByRole("button", { name: "Filter by created date" })

const openFilter = async (): Promise<void> => {
  await userEvent.click(trigger())
}

const applyToday = async (): Promise<void> => {
  await openFilter()
  await userEvent.click(screen.getByRole("button", { name: "Date" }))
  await userEvent.click(screen.getByRole("button", { name: "Today" }))
  await userEvent.click(screen.getByRole("button", { name: "Apply" }))
}

beforeEach(() => {
  stubResizeObserver()
})

afterEach(() => {
  cleanup()
})

describe("AdminDateColumnFilter before anything is applied", () => {
  it("shows the column label on the trigger", () => {
    renderWithProviders(<FilterHarness />)

    expect(trigger().textContent).toBe("Created")
  })

  it("leaves the column unfiltered", () => {
    renderWithProviders(<FilterHarness />)

    expect(JSON.parse(filterValue())).toBeNull()
  })

  it("cannot apply an empty draft", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })

  it("offers no clear action", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()

    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })

  it("starts on the on operator, so one date is enough", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()

    expect(screen.getByRole("button", { name: "Date" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Start date" })).toBeNull()
  })
})

describe("AdminDateColumnFilter applying a date", () => {
  it("writes the chosen date onto the column", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()

    expect(JSON.parse(filterValue())).toStrictEqual({ date: TODAY_ISO, operator: "on" })
  })

  it("closes the popover once applied", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull()
  })

  it("summarises the applied date on the trigger", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()

    expect(trigger().textContent.startsWith("= ")).toBe(true)
  })

  it("marks the trigger as active", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()

    expect(trigger()).toHaveClass("bg-primary/5")
  })

  it("reopens the form on the applied date", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()
    await openFilter()

    expect(screen.getByRole("button", { name: "Date" }).textContent).not.toBe("Any date")
  })
})

describe("AdminDateColumnFilter clearing a date", () => {
  it("removes the filter from the column", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()
    await openFilter()
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(JSON.parse(filterValue())).toBeNull()
  })

  it("restores the plain column label", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()
    await openFilter()
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(trigger().textContent).toBe("Created")
  })

  it("empties the draft, so apply is blocked again", async () => {
    renderWithProviders(<FilterHarness />)

    await applyToday()
    await openFilter()
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    await openFilter()

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })
})
