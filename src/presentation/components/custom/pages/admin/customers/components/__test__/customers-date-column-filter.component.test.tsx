import { type JSX, type ReactNode } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { DATE_COLUMN_FILTER_OPERATOR, type DateColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { matchesDateColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { CustomersDateColumnFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-date-column-filter"
import {
  CUSTOMERS_DATA_GRID_KEY,
  customersDataGrid,
} from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

type CustomerRow = User["adminCustomerListItem"]

const TODAY = new Date(2026, 2, 15, 9, 30)

const customerRow = (id: string, createdAt: Date): CustomerRow => ({
  averageOrderValue: 0,
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt,
  email: `${id}@example.test`,
  emailVerified: true,
  id,
  image: null,
  isAnonymous: false,
  metadata: null,
  name: "Anna Kowalska",
  orderCount: 0,
  phone: null,
  role: ROLES.CUSTOMER,
  stripeCustomerId: null,
  timezone: null,
  totalSpent: 0,
  twoFactorEnabled: false,
  updatedAt: createdAt,
})

const ROWS: CustomerRow[] = [customerRow("older", new Date(2026, 2, 10, 12, 0)), customerRow("today", new Date(2026, 2, 15, 8, 0))]

const helper = createColumnHelper<DataGridFeatures, CustomerRow>()

const COLUMNS = helper.columns([
  helper.accessor("createdAt", {
    filterFn: matchesDateColumnFilter,
    header: "Account created",
    id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt,
  }),
])

const GridHarness = ({
  children,
  initialFilter,
}: Readonly<{ children: ReactNode; initialFilter?: DateColumnFilterValue }>): JSX.Element => {
  const table = useTable<DataGridFeatures, CustomerRow>({
    columns: COLUMNS,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
    initialState:
      initialFilter === undefined ? {} : { columnFilters: [{ id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt, value: initialFilter }] },
  })

  const value: DataGridContextValue<CustomerRow> = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading: false,
    persistenceKey: CUSTOMERS_DATA_GRID_KEY,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search customers",
    table,
  }

  return (
    <customersDataGrid.Provider value={value}>
      {children}
      <output data-testid="matching-rows">
        {table
          .getFilteredRowModel()
          .rows.map((row) => row.id)
          .join(",")}
      </output>
    </customersDataGrid.Provider>
  )
}

const renderCreatedAtFilter = (): void => {
  renderWithProviders(
    <GridHarness>
      <CustomersDateColumnFilter
        ariaLabelKey="filter.createdAt"
        columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt}
        labelKey="columns.createdAt"
      />
    </GridHarness>,
  )
}

const trigger = (): HTMLElement => screen.getByRole("button", { name: "Filter by account created date" })

const openPopover = (): void => {
  fireEvent.click(trigger())
}

const pickOperator = async (label: string): Promise<void> => {
  await userEvent.click(screen.getByRole("combobox"))
  const options = await screen.findAllByRole("option")
  const target = options.find((option) => option.textContent === label)
  if (target === undefined) {
    throw new Error(`No operator option labelled ${label}`)
  }
  await userEvent.click(target)
}

const applyToday = (): void => {
  openPopover()
  fireEvent.click(screen.getByLabelText("Date"))
  fireEvent.click(screen.getByText("Today"))
  fireEvent.click(screen.getByRole("button", { name: "Apply" }))
}

afterEach(() => {
  cleanup()
})

describe("CustomersDateColumnFilter", () => {
  it("labels the idle trigger with the column copy", () => {
    renderCreatedAtFilter()

    expect(trigger()).toHaveTextContent("Account created")
  })

  it("takes the accessible name and the label from the keys it is handed", () => {
    renderWithProviders(
      <GridHarness>
        <CustomersDateColumnFilter
          ariaLabelKey="filter.lastOrderAt"
          columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt}
          labelKey="columns.lastOrder"
        />
      </GridHarness>,
    )

    expect(screen.getByRole("button", { name: "Filter by last order date" })).toHaveTextContent("Last Order")
  })

  it("opens a popover titled after the column with the on operator preselected", () => {
    renderCreatedAtFilter()
    openPopover()

    expect(screen.getByText("Condition")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("On")
  })

  it("offers every date operator the column filters define", () => {
    renderCreatedAtFilter()
    openPopover()
    fireEvent.click(screen.getByRole("combobox"))

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual(["On", "Before", "After", "Date range"])
  })

  it("keeps apply out of reach until a date is chosen", () => {
    renderCreatedAtFilter()
    openPopover()

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument()
  })

  it("swaps the single date picker for a range when the between operator is chosen", async () => {
    renderCreatedAtFilter()
    openPopover()
    await pickOperator("Date range")

    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.getByLabelText("To")).toBeInTheDocument()
    expect(screen.queryByLabelText("Date")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
  })

  it("keeps the single date picker for the before operator", async () => {
    renderCreatedAtFilter()
    openPopover()
    await pickOperator("Before")

    expect(screen.getByRole("combobox")).toHaveTextContent("Before")
    expect(screen.getByLabelText("Date")).toBeInTheDocument()
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument()
  })
})

describe("CustomersDateColumnFilter applied to the table", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: TODAY, shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("narrows the table to the customers created on the chosen day", () => {
    renderCreatedAtFilter()
    applyToday()

    expect(screen.getByTestId("matching-rows")).toHaveTextContent("today")
    expect(trigger()).toHaveTextContent("= Mar 15, 2026")
  })

  it("closes the popover once the filter is applied", () => {
    renderCreatedAtFilter()
    applyToday()

    expect(screen.queryByText("Condition")).not.toBeInTheDocument()
  })

  it("restores the applied filter into the draft when the popover is reopened", () => {
    renderCreatedAtFilter()
    applyToday()
    openPopover()

    expect(screen.getByLabelText("Date")).toHaveTextContent("3/15/26")
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
  })

  it("drops the filter and every row comes back when the admin clears it", () => {
    renderCreatedAtFilter()
    applyToday()
    openPopover()
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(screen.getByTestId("matching-rows")).toHaveTextContent("older,today")
    expect(trigger()).toHaveTextContent("Account created")
  })
})

describe("CustomersDateColumnFilter restoring a saved range", () => {
  const RANGE: DateColumnFilterValue = {
    endDate: "2026-03-12",
    operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
    startDate: "2026-03-01",
  }

  const renderWithRange = (): void => {
    renderWithProviders(
      <GridHarness initialFilter={RANGE}>
        <CustomersDateColumnFilter
          ariaLabelKey="filter.createdAt"
          columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt}
          labelKey="columns.createdAt"
        />
      </GridHarness>,
    )
  }

  it("spells both ends of the saved range on the trigger", () => {
    renderWithRange()

    expect(trigger()).toHaveTextContent("Mar 1, 2026 – Mar 12, 2026")
  })

  it("keeps only the customers created inside the range", () => {
    renderWithRange()

    expect(screen.getByTestId("matching-rows")).toHaveTextContent("older")
  })

  it("reopens on the range operator with both ends filled in", () => {
    renderWithRange()
    openPopover()

    expect(screen.getByRole("combobox")).toHaveTextContent("Date range")
    expect(screen.getByLabelText("From")).toHaveTextContent("3/1/26")
    expect(screen.getByLabelText("To")).toHaveTextContent("3/12/26")
  })

  it("reapplies the restored range untouched", () => {
    renderWithRange()
    openPopover()
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(screen.getByTestId("matching-rows")).toHaveTextContent("older")
    expect(trigger()).toHaveTextContent("Mar 1, 2026 – Mar 12, 2026")
  })

  it("moves the start of the range to the day the admin picks", () => {
    renderWithRange()
    openPopover()
    fireEvent.click(screen.getByLabelText("From"))
    fireEvent.click(screen.getByRole("button", { name: "Thursday, March 5th, 2026" }))
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(trigger()).toHaveTextContent("Mar 5, 2026 – Mar 12, 2026")
    expect(screen.getByTestId("matching-rows")).toHaveTextContent("older")
  })

  it("moves the end of the range to the day the admin picks", () => {
    renderWithRange()
    openPopover()
    fireEvent.click(screen.getByLabelText("To"))
    fireEvent.click(screen.getByRole("button", { name: "Wednesday, March 11th, 2026" }))
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(trigger()).toHaveTextContent("Mar 1, 2026 – Mar 11, 2026")
    expect(screen.getByTestId("matching-rows")).toHaveTextContent("older")
  })

  it("drops the customer created after a shortened range", () => {
    renderWithRange()
    openPopover()
    fireEvent.click(screen.getByLabelText("To"))
    fireEvent.click(screen.getByRole("button", { name: "Sunday, March 8th, 2026" }))
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(trigger()).toHaveTextContent("Mar 1, 2026 – Mar 8, 2026")
    expect(screen.getByTestId("matching-rows")).toBeEmptyDOMElement()
  })
})
