import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

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

const filterValue = (): string => screen.getByTestId(FILTER_VALUE_TEST_ID).textContent

const openFilter = async (): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name: "Filter by price" }))
}

beforeEach(() => {
  stubResizeObserver()
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(() => {
  cleanup()
})

describe("AdminNumericColumnFilter trigger", () => {
  it("shows the column label while no filter is applied", () => {
    renderWithProviders(<FilterHarness />)

    expect(screen.getByRole("button", { name: "Filter by price" }).textContent).toBe("Price")
  })

  it("keeps the popover closed until the trigger is pressed", () => {
    renderWithProviders(<FilterHarness />)

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull()
  })

  it("opens the filter form on the trigger", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()

    expect(screen.getByLabelText("Amount")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument()
  })

  it("offers no clear action while nothing is applied", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()

    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })

  it("cannot apply an empty draft", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })
})

describe("AdminNumericColumnFilter applying a filter", () => {
  it("writes the drafted comparison onto the column", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(JSON.parse(filterValue())).toStrictEqual({ amountMinorUnits: 250, operator: "gte" })
  })

  it("closes the popover once the filter is applied", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull()
  })

  it("summarises the applied filter on the trigger", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(screen.getByRole("button", { name: "Filter by price" }).textContent).toBe("≥ 250")
  })

  it("marks the trigger as active once a filter is applied", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(screen.getByRole("button", { name: "Filter by price" })).toHaveClass("bg-primary/5")
  })
})

describe("AdminNumericColumnFilter clearing a filter", () => {
  it("removes the filter from the column", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    await openFilter()
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(JSON.parse(filterValue())).toBeNull()
  })

  it("restores the plain column label on the trigger", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    await openFilter()
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(screen.getByRole("button", { name: "Filter by price" }).textContent).toBe("Price")
  })

  it("reopens the form pre-filled with the applied amount", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    await openFilter()

    expect(screen.getByLabelText("Amount")).toHaveValue("250")
  })
})

describe("AdminNumericColumnFilter comparisons", () => {
  it("offers every comparison the filter supports", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.click(screen.getByRole("combobox"))

    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual([
      "At least",
      "Greater than",
      "Equals",
      "Less than",
      "At most",
      "Between",
    ])
  })

  it("applies an exact match", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Equals" }))
    await userEvent.type(screen.getByLabelText("Amount"), "400")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(JSON.parse(filterValue())).toStrictEqual({ amountMinorUnits: 400, operator: "eq" })
  })

  it("swaps the single amount for a range once between is chosen", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Between" }))

    expect(screen.queryByLabelText("Amount")).toBeNull()
    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.getByLabelText("To")).toBeInTheDocument()
  })

  it("applies both ends of a range", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Between" }))
    await userEvent.type(screen.getByLabelText("From"), "100")
    await userEvent.type(screen.getByLabelText("To"), "300")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(JSON.parse(filterValue())).toStrictEqual({ endAmountMinorUnits: 300, operator: "between", startAmountMinorUnits: 100 })
  })

  it("refuses to apply a half filled range", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Between" }))
    await userEvent.type(screen.getByLabelText("From"), "100")

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })

  it("keeps only the rows inside the applied range", async () => {
    renderWithProviders(<FilterHarness />)

    await openFilter()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Less than" }))
    await userEvent.type(screen.getByLabelText("Amount"), "250")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(JSON.parse(filterValue())).toStrictEqual({ amountMinorUnits: 250, operator: "lt" })
  })
})
