import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface CapturedProps {
  readonly ariaLabel: string
  readonly columnId: string
  readonly label: string
  readonly labels: Record<string, string>
  readonly table: unknown
}

const captured = vi.hoisted(() => ({ props: [] as CapturedProps[], table: { id: "orders-table" } }))

vi.mock("~/src/presentation/components/custom/pages/admin/lib/admin-date-column-filter", () => ({
  AdminDateColumnFilter: (props: CapturedProps): JSX.Element => {
    captured.props.push(props)

    return <output data-testid="date-filter">{props.label}</output>
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid", () => ({
  ordersDataGrid: { useDataGrid: () => ({ table: captured.table }) },
}))

import { OrdersDateColumnFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-date-column-filter"

const render = () =>
  renderWithProviders(<OrdersDateColumnFilter ariaLabelKey="filter.createdAt" columnId="createdAt" labelKey="columns.date" />)

const lastProps = (): CapturedProps => {
  const props = captured.props.at(-1)
  if (props === undefined) {
    throw new Error("The date filter was never rendered")
  }

  return props
}

beforeEach(() => {
  captured.props.length = 0
})

afterEach(() => {
  cleanup()
})

describe("OrdersDateColumnFilter", () => {
  it("renders the shared admin date filter", () => {
    render()

    expect(screen.getByTestId("date-filter")).toBeInTheDocument()
  })

  it("passes the translated column label and accessible name", () => {
    render()

    expect(lastProps().label).toBe("Date")
    expect(lastProps().ariaLabel).toBe("Filter by date")
  })

  it("filters the column it was pointed at, on the orders table", () => {
    render()

    expect(lastProps().columnId).toBe("createdAt")
    expect(lastProps().table).toBe(captured.table)
  })

  it("translates every label the date popover needs", () => {
    render()

    expect(lastProps().labels).toStrictEqual({
      apply: "Apply",
      clear: "Clear",
      clearDate: "Clear date",
      date: "Date",
      endDate: "To",
      operator: "Condition",
      operatorAfter: "After",
      operatorBefore: "Before",
      operatorBetween: "Date range",
      operatorOn: "On",
      placeholder: "Pick a date",
      startDate: "From",
      today: "Today",
    })
  })
})
