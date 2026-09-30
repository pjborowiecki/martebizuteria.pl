import { type JSX, type ReactNode } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

import { matchesDateColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

vi.mock("~/src/presentation/components/shadcn/select", async (importOriginal) => ({
  ...(await importOriginal<typeof SelectComponents>()),
  Select: ({ onValueChange, value }: Readonly<{ onValueChange: (value: string | null) => void; value: string }>): JSX.Element => (
    <>
      <button
        onClick={() => {
          onValueChange(null)
        }}
        type="button"
      >
        Emit empty condition
      </button>
      <button
        onClick={() => {
          onValueChange("sometime")
        }}
        type="button"
      >
        Emit an unknown condition
      </button>
      <button
        onClick={() => {
          onValueChange("between")
        }}
        type="button"
      >
        Emit the range condition
      </button>
      <output data-testid="condition">{value}</output>
    </>
  ),
}))

import { CustomersDateColumnFilter } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-date-column-filter"
import {
  CUSTOMERS_DATA_GRID_KEY,
  customersDataGrid,
} from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

type CustomerRow = User["adminCustomerListItem"]

const CREATED_AT = new Date(2026, 2, 10, 12, 0)

const ROWS: CustomerRow[] = [
  {
    averageOrderValue: 0,
    banExpires: null,
    banReason: null,
    banned: false,
    createdAt: CREATED_AT,
    email: "anna@example.test",
    emailVerified: true,
    id: "anna",
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
    updatedAt: CREATED_AT,
  },
]

const helper = createColumnHelper<DataGridFeatures, CustomerRow>()

const COLUMNS = helper.columns([
  helper.accessor("createdAt", {
    filterFn: matchesDateColumnFilter,
    header: "Account created",
    id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt,
  }),
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

const openCreatedAtFilter = (): void => {
  renderWithProviders(
    <GridHarness>
      <CustomersDateColumnFilter
        ariaLabelKey="filter.createdAt"
        columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt}
        labelKey="columns.createdAt"
      />
    </GridHarness>,
  )
  fireEvent.click(screen.getByRole("button", { name: "Filter by account created date" }))
}

afterEach(() => {
  cleanup()
})

describe("CustomersDateColumnFilter given a condition it does not define", () => {
  it.each([
    { button: "Emit empty condition", name: "no selection" },
    { button: "Emit an unknown condition", name: "an unknown condition" },
  ])("keeps the single date picker on the on condition for $name", async ({ button }) => {
    openCreatedAtFilter()

    await userEvent.click(screen.getByRole("button", { name: button }))

    expect(screen.getByTestId("condition")).toHaveTextContent("on")
    expect(screen.getByLabelText("Date")).toBeInTheDocument()
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument()
  })

  it("still accepts a condition the date filter does define", async () => {
    openCreatedAtFilter()

    await userEvent.click(screen.getByRole("button", { name: "Emit the range condition" }))

    expect(screen.getByTestId("condition")).toHaveTextContent("between")
    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.getByLabelText("To")).toBeInTheDocument()
  })

  it("keeps the range condition when the control then reports no selection", async () => {
    openCreatedAtFilter()

    await userEvent.click(screen.getByRole("button", { name: "Emit the range condition" }))
    await userEvent.click(screen.getByRole("button", { name: "Emit empty condition" }))

    expect(screen.getByTestId("condition")).toHaveTextContent("between")
    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.queryByLabelText("Date")).not.toBeInTheDocument()
  })
})
