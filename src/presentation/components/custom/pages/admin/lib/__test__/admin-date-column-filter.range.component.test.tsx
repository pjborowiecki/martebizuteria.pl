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

const chooseBetween = async (): Promise<void> => {
  await userEvent.click(screen.getByRole("combobox"))
  const options = await screen.findAllByRole("option")
  const between = options.find((option) => option.textContent === "Between")
  if (between === undefined) {
    throw new Error("expected a Between option")
  }
  await userEvent.click(between)
}

const pickToday = async (name: string): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name }))
  await userEvent.click(screen.getByRole("button", { name: "Today" }))
}

const applyTodayRange = async (): Promise<void> => {
  await openFilter()
  await chooseBetween()
  await pickToday("Start date")
  await pickToday("End date")
  await userEvent.click(screen.getByRole("button", { name: "Apply" }))
}

beforeEach(() => {
  stubResizeObserver()
})

afterEach(() => {
  cleanup()
})

describe("AdminDateColumnFilter in range mode", () => {
  it("swaps the single date field for a pair of range fields", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()
    await chooseBetween()

    expect(screen.getByRole("button", { name: "Start date" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "End date" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Date" })).toBeNull()
  })

  it("blocks apply until both ends of the range are chosen", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()
    await chooseBetween()

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()

    await pickToday("Start date")

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })

  it("allows apply once both ends are chosen", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()
    await chooseBetween()
    await pickToday("Start date")
    await pickToday("End date")

    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled()
  })

  it("writes both ends of the range onto the column", async () => {
    renderWithProviders(<FilterHarness />)
    await applyTodayRange()

    expect(JSON.parse(filterValue())).toStrictEqual({ endDate: TODAY_ISO, operator: "between", startDate: TODAY_ISO })
  })

  it("summarises the range on the trigger", async () => {
    renderWithProviders(<FilterHarness />)
    await applyTodayRange()

    expect(trigger().textContent).toContain(" – ")
  })

  it("reopens on the range it applied rather than an empty draft", async () => {
    renderWithProviders(<FilterHarness />)
    await applyTodayRange()
    await openFilter()

    expect(screen.getByRole("combobox")).toHaveTextContent("Between")
    expect(screen.getByRole("button", { name: "Start date" }).textContent).not.toBe("Any date")
    expect(screen.getByRole("button", { name: "End date" }).textContent).not.toBe("Any date")
  })

  it("clears the whole range at once", async () => {
    renderWithProviders(<FilterHarness />)
    await applyTodayRange()
    await openFilter()
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(JSON.parse(filterValue())).toBeNull()
    expect(trigger().textContent).toBe("Created")
  })
})
