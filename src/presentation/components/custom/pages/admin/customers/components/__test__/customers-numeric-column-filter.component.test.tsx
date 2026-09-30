import { type JSX, type ReactNode } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { CustomersNumericColumnFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-numeric-column-filter"
import {
  CUSTOMERS_DATA_GRID_KEY,
  customersDataGrid,
} from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

type CustomerRow = User["adminCustomerListItem"]

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const customerRow = (id: string, totalSpent: number, averageOrderValue: number): CustomerRow => ({
  averageOrderValue,
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: EPOCH,
  email: `${id}@example.test`,
  emailVerified: true,
  id,
  image: null,
  isAnonymous: false,
  metadata: null,
  name: "Anna Kowalska",
  orderCount: 2,
  phone: null,
  role: ROLES.CUSTOMER,
  stripeCustomerId: null,
  timezone: null,
  totalSpent,
  twoFactorEnabled: false,
  updatedAt: EPOCH,
})

const ROWS: CustomerRow[] = [customerRow("user-1", 120_000, 60_000), customerRow("user-2", 10_000, 5000)]

const helper = createColumnHelper<DataGridFeatures, CustomerRow>()

const COLUMNS = helper.columns([
  helper.accessor("totalSpent", { header: "Total spent", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent }),
  helper.accessor("averageOrderValue", { header: "Average", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue }),
])

const GridHarness = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const table = useTable<DataGridFeatures, CustomerRow>({
    columns: COLUMNS,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
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

  return <customersDataGrid.Provider value={value}>{children}</customersDataGrid.Provider>
}

const renderSpentFilter = (): void => {
  renderWithProviders(
    <GridHarness>
      <CustomersNumericColumnFilter
        ariaLabelKey="filter.totalSpent"
        columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent}
        labelKey="columns.spent"
      />
    </GridHarness>,
  )
}

afterEach(cleanup)

describe("CustomersNumericColumnFilter", () => {
  it("labels the trigger from the customers filter copy", () => {
    renderSpentFilter()

    expect(screen.getByRole("button", { name: "Filter by total spent" })).toHaveTextContent("Total Spent")
  })

  it("takes its aria label and column label from the keys it is handed", () => {
    renderWithProviders(
      <GridHarness>
        <CustomersNumericColumnFilter
          ariaLabelKey="filter.averageOrderValue"
          columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue}
          labelKey="columns.averageOrderValue"
        />
      </GridHarness>,
    )

    expect(screen.getByRole("button", { name: "Filter by average order value" })).toHaveTextContent("Average order value")
  })

  it("opens a money filter with the customers operator copy", async () => {
    renderSpentFilter()
    await userEvent.click(screen.getByRole("button", { name: "Filter by total spent" }))

    expect(screen.getByText("Condition")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("At least")
  })

  it("offers every numeric operator the column filters define", async () => {
    renderSpentFilter()
    await userEvent.click(screen.getByRole("button", { name: "Filter by total spent" }))
    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual([
      "At least",
      "More than",
      "Exactly",
      "Less than",
      "At most",
      "Between",
    ])
  })

  it("narrows the table to the customers above the amount the admin entered", async () => {
    renderSpentFilter()
    await userEvent.click(screen.getByRole("button", { name: "Filter by total spent" }))
    await userEvent.type(screen.getByLabelText("Amount"), "500")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(screen.getByRole("button", { name: "Filter by total spent" })).toHaveTextContent("≥")
  })
})
