import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { formatDateToIsoDateLocal } from "~/src/modules/_core/utils/iso-date"

const UNKNOWN_OPERATOR = "sometime"

vi.mock("~/src/presentation/components/custom/pages/admin/lib/admin-date-filter-form", () => ({
  AdminDateFilterForm: ({
    draft,
    onDateChange,
    onOperatorChange,
    todayIso,
  }: Readonly<{
    draft: { operator: string }
    onDateChange: (isoDate: string) => void
    onOperatorChange: (value: string | null) => void
    todayIso: string
  }>): JSX.Element => (
    <div>
      <p data-testid="draft-operator">{draft.operator}</p>
      <button
        onClick={() => {
          onDateChange(todayIso)
        }}
        type="button"
      >
        pick today
      </button>
      <button
        onClick={() => {
          onOperatorChange(UNKNOWN_OPERATOR)
        }}
        type="button"
      >
        send unknown operator
      </button>
      <button
        onClick={() => {
          onOperatorChange(null)
        }}
        type="button"
      >
        send no operator
      </button>
      <button
        onClick={() => {
          onOperatorChange("before")
        }}
        type="button"
      >
        send before operator
      </button>
    </div>
  ),
}))

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

const filterValue = (): unknown => JSON.parse(screen.getByTestId(FILTER_VALUE_TEST_ID).textContent)

const draftOperator = (): string | null => screen.getByTestId("draft-operator").textContent

const press = async (name: string): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name }))
}

const openFilter = async (): Promise<void> => {
  await press("Filter by created date")
}

beforeEach(() => {
  stubResizeObserver()
})

afterEach(cleanup)

describe("AdminDateColumnFilter given an operator it cannot recognise", () => {
  it("keeps the draft on the operator it opened with", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()

    await press("send unknown operator")

    expect(draftOperator()).toBe("on")
  })

  it("keeps the draft on the operator it opened with when the picker reports no operator", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()

    await press("send no operator")

    expect(draftOperator()).toBe("on")
  })

  it("still applies the single date comparison the draft was left on", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()
    await press("pick today")

    await press("send unknown operator")
    await press("Apply")

    expect(filterValue()).toStrictEqual({ date: TODAY_ISO, operator: "on" })
  })

  it("does adopt an operator it does recognise", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()
    await press("pick today")

    await press("send before operator")
    await press("Apply")

    expect(filterValue()).toStrictEqual({ date: TODAY_ISO, operator: "before" })
  })
})
