import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const UNKNOWN_OPERATOR = "roughly"

vi.mock("~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter-form", () => ({
  AdminNumericColumnFilterForm: ({
    draft,
    onAmountChange,
    onApply,
    onOperatorChange,
  }: Readonly<{
    draft: { amount: string; operator: string }
    onAmountChange: (amount: string) => void
    onApply: () => void
    onOperatorChange: (value: string | null) => void
  }>): JSX.Element => (
    <div>
      <p data-testid="draft-operator">{draft.operator}</p>
      <p data-testid="draft-amount">{draft.amount}</p>
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
          onOperatorChange("lte")
        }}
        type="button"
      >
        send at most operator
      </button>
      <button
        onClick={() => {
          onAmountChange("250")
        }}
        type="button"
      >
        type an amount
      </button>
      <button onClick={onApply} type="button">
        force apply
      </button>
    </div>
  ),
  isRangeNumericOperator: (operator: string): boolean => operator === "between",
}))

import {
  DataGridHarness,
  type HarnessRow,
  stubResizeObserver,
} from "~/src/presentation/components/custom/datagrid/components/__test__/data-grid-harness"
import { AdminNumericColumnFilter } from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter"
import { type AdminNumericColumnFilterLabels } from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter.types"

const LABELS: AdminNumericColumnFilterLabels = {
  amount: "Amount",
  apply: "Apply",
  clear: "Clear",
  endAmount: "To",
  operator: "Comparison",
  operatorBetween: "Between",
  operatorEq: "Equals",
  operatorGt: "Greater than",
  operatorGte: "At least",
  operatorLt: "Less than",
  operatorLte: "At most",
  startAmount: "From",
}

const FILTER_VALUE_TEST_ID = "price-filter-value"

const FilterHarness = (): JSX.Element => (
  <DataGridHarness>
    {(table) => (
      <>
        <AdminNumericColumnFilter<HarnessRow>
          ariaLabel="Filter by price"
          columnId="price"
          currencyCode="PLN"
          inputMode="integer"
          label="Price"
          labels={LABELS}
          table={table}
        />
        <p data-testid={FILTER_VALUE_TEST_ID}>{JSON.stringify(table.getColumn("price")?.getFilterValue() ?? null)}</p>
      </>
    )}
  </DataGridHarness>
)

const filterValue = (): unknown => JSON.parse(screen.getByTestId(FILTER_VALUE_TEST_ID).textContent)

const draftOperator = (): string => screen.getByTestId("draft-operator").textContent

const press = async (name: string): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name }))
}

const openFilter = async (): Promise<void> => {
  await press("Filter by price")
}

beforeEach(() => {
  stubResizeObserver()
})

afterEach(cleanup)

describe("AdminNumericColumnFilter given a comparison it cannot recognise", () => {
  it("keeps the comparison the form opened with", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()

    await press("send unknown operator")

    expect(draftOperator()).toBe("gte")
  })

  it("keeps the comparison when the picker reports none at all", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()

    await press("send no operator")

    expect(draftOperator()).toBe("gte")
  })

  it("still applies the comparison the draft was left on", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()
    await press("type an amount")

    await press("send unknown operator")
    await press("force apply")

    expect(filterValue()).toStrictEqual({ amountMinorUnits: 250, operator: "gte" })
  })

  it("adopts a comparison it does recognise", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()
    await press("type an amount")

    await press("send at most operator")
    await press("force apply")

    expect(filterValue()).toStrictEqual({ amountMinorUnits: 250, operator: "lte" })
  })
})

describe("AdminNumericColumnFilter asked to apply an amount it cannot read", () => {
  it("leaves the column unfiltered", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()

    await press("force apply")

    expect(filterValue()).toBeNull()
  })

  it("leaves the form open so the amount can still be typed", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()

    await press("force apply")

    expect(screen.getByRole("button", { name: "force apply" })).toBeInTheDocument()
  })

  it("keeps the plain column label on the trigger", async () => {
    renderWithProviders(<FilterHarness />)
    await openFilter()

    await press("force apply")

    expect(screen.getByRole("button", { name: "Filter by price" }).textContent).toBe("Price")
  })
})
