import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import {
  AdminNumericColumnFilterForm,
  isRangeNumericOperator,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter-form"
import {
  type AdminNumericColumnFilterLabels,
  type NumericFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter.types"

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

const OPERATOR_OPTIONS = [
  { label: LABELS.operatorGte, value: NUMERIC_COLUMN_FILTER_OPERATOR.GTE },
  { label: LABELS.operatorBetween, value: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN },
]

const draft = (overrides: Partial<NumericFilterDraft> = {}): NumericFilterDraft => ({
  amount: "",
  endAmount: "",
  operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE,
  startAmount: "",
  ...overrides,
})

const handlers = () => ({
  onAmountChange: vi.fn(),
  onApply: vi.fn(),
  onClear: vi.fn(),
  onEndAmountChange: vi.fn(),
  onOperatorChange: vi.fn(),
  onStartAmountChange: vi.fn(),
})

const renderForm = ({
  canApply = true,
  hasActiveFilter = false,
  inputMode = "money",
  isRangeOperator = false,
  numericDraft = draft(),
}: {
  canApply?: boolean
  hasActiveFilter?: boolean
  inputMode?: "integer" | "money"
  isRangeOperator?: boolean
  numericDraft?: NumericFilterDraft
} = {}) => {
  const callbacks = handlers()
  renderWithProviders(
    <AdminNumericColumnFilterForm
      canApply={canApply}
      currencyCode="PLN"
      draft={numericDraft}
      hasActiveFilter={hasActiveFilter}
      inputMode={inputMode}
      isRangeOperator={isRangeOperator}
      labels={LABELS}
      operatorOptions={OPERATOR_OPTIONS}
      {...callbacks}
    />,
  )

  return callbacks
}

afterEach(() => {
  cleanup()
})

describe("AdminNumericColumnFilterForm layout", () => {
  it("offers a single amount field for a comparison operator", () => {
    renderForm()

    expect(screen.getByLabelText("Amount")).toBeInTheDocument()
    expect(screen.queryByLabelText("From")).toBeNull()
    expect(screen.queryByLabelText("To")).toBeNull()
  })

  it("offers both bounds for a range operator", () => {
    renderForm({ isRangeOperator: true, numericDraft: draft({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN }) })

    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.getByLabelText("To")).toBeInTheDocument()
    expect(screen.queryByLabelText("Amount")).toBeNull()
  })

  it("labels the operator control", () => {
    renderForm()

    expect(screen.getByText("Comparison")).toBeInTheDocument()
  })

  it("reformats the draft amount for the active locale", () => {
    renderForm({ numericDraft: draft({ amount: "120,00" }) })

    expect(screen.getByLabelText("Amount")).toHaveValue("120.00")
  })

  it("shows both draft bounds in a range", () => {
    renderForm({
      isRangeOperator: true,
      numericDraft: draft({ endAmount: "900", operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmount: "100" }),
    })

    expect(screen.getByLabelText("From")).toHaveValue("100.00")
    expect(screen.getByLabelText("To")).toHaveValue("900.00")
  })

  it("keeps integer amounts unformatted in integer mode", () => {
    renderForm({ inputMode: "integer", numericDraft: draft({ amount: "12" }) })

    expect(screen.getByLabelText("Amount")).toHaveValue("12")
  })
})

describe("AdminNumericColumnFilterForm actions", () => {
  it("only offers to clear when a filter is already applied", () => {
    renderForm({ hasActiveFilter: false })

    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })

  it("offers to clear an applied filter", () => {
    renderForm({ hasActiveFilter: true })

    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
  })

  it("blocks apply while the draft is incomplete", () => {
    renderForm({ canApply: false })

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })

  it("applies a valid draft when apply is pressed", async () => {
    const { onApply } = renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it("clears the filter when clear is pressed", async () => {
    const { onClear } = renderForm({ hasActiveFilter: true })

    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("reports each typed digit of an integer amount", async () => {
    const { onAmountChange } = renderForm({ inputMode: "integer" })

    await userEvent.type(screen.getByLabelText("Amount"), "7")

    expect(onAmountChange).toHaveBeenCalledWith("7")
  })

  it("strips non digits from an integer amount", async () => {
    const { onAmountChange } = renderForm({ inputMode: "integer" })

    await userEvent.type(screen.getByLabelText("Amount"), "a")

    expect(onAmountChange).toHaveBeenCalledWith("")
  })

  it("reports a typed start bound of a range", async () => {
    const { onEndAmountChange, onStartAmountChange } = renderForm({
      inputMode: "integer",
      isRangeOperator: true,
      numericDraft: draft({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN }),
    })

    await userEvent.type(screen.getByLabelText("From"), "5")

    expect(onStartAmountChange).toHaveBeenCalledWith("5")
    expect(onEndAmountChange).not.toHaveBeenCalled()
  })
})

describe("isRangeNumericOperator", () => {
  it("recognises the between operator", () => {
    expect(isRangeNumericOperator(NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN)).toBe(true)
  })

  it.each([
    [NUMERIC_COLUMN_FILTER_OPERATOR.EQ],
    [NUMERIC_COLUMN_FILTER_OPERATOR.GT],
    [NUMERIC_COLUMN_FILTER_OPERATOR.GTE],
    [NUMERIC_COLUMN_FILTER_OPERATOR.LT],
    [NUMERIC_COLUMN_FILTER_OPERATOR.LTE],
    ["nonsense"],
  ])("does not treat %s as a range", (operator) => {
    expect(isRangeNumericOperator(operator)).toBe(false)
  })
})
