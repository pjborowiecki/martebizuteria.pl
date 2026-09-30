import { type JSX, type ReactNode } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { customersDataGrid } from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

type CustomerRow = User["adminCustomerListItem"]

export const customerRow = (overrides: Partial<CustomerRow> = {}): CustomerRow => ({
  averageOrderValue: 0,
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: new Date(2024, 0, 1),
  email: "anna@example.com",
  emailVerified: true,
  id: "user-1",
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
  updatedAt: new Date(2024, 0, 1),
  ...overrides,
})

const helper = createColumnHelper<DataGridFeatures, CustomerRow>()

const COLUMNS = helper.columns([
  helper.accessor("banned", { header: "Banned", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned }),
  helper.accessor("emailVerified", { header: "Email verified", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified }),
  helper.accessor("role", { filterFn: "equalsString", header: "Role", id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.role }),
])

const GridHarness = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const table = useTable<DataGridFeatures, CustomerRow>({
    columns: COLUMNS,
    data: HARNESS_ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  const value = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading: false,
    persistenceKey: customersDataGrid.persistenceKey,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search customers",
    table,
  }

  return <customersDataGrid.Provider value={value}>{children}</customersDataGrid.Provider>
}

export const HARNESS_ROWS: CustomerRow[] = [
  customerRow(),
  customerRow({ banned: true, email: "jan@example.com", emailVerified: false, id: "user-2", name: "Jan Nowak", role: ROLES.ADMIN }),
]

export const renderWithCustomersGrid = (filter: ReactNode) => renderWithProviders(<GridHarness>{filter}</GridHarness>)
