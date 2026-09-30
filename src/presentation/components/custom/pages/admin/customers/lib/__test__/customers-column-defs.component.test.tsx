import { type JSX, useMemo } from "react"

import { type ColumnFiltersState, flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type User } from "~/src/modules/user/user.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-row-actions", () => ({
  CustomersRowActions: () => <span>row actions</span>,
}))

import { buildCustomerColumns } from "~/src/presentation/components/custom/pages/admin/customers/lib/customers-column-defs"

type AdminCustomerRow = User["adminCustomerListItem"]

const CREATED_AT = new Date("2026-01-15T10:00:00.000Z")

const customer = (overrides: Partial<AdminCustomerRow> = {}): AdminCustomerRow => ({
  averageOrderValue: 9950,
  banExpires: null,
  banReason: null,
  banned: false,
  city: "Warsaw",
  countryCode: "PL",
  createdAt: CREATED_AT,
  email: "ada@example.test",
  emailVerified: true,
  id: "user-1",
  image: null,
  isAnonymous: false,
  lastOrderAt: new Date("2026-02-20T10:00:00.000Z"),
  metadata: null,
  name: "Ada Lovelace",
  orderCount: 4,
  phone: "+48 123 456 789",
  province: "Mazowieckie",
  role: "customer",
  stripeCustomerId: "cus_123",
  timezone: "Europe/Warsaw",
  totalSpent: 39_800,
  twoFactorEnabled: false,
  updatedAt: CREATED_AT,
  ...overrides,
})

const ColumnsProbe = ({ filters = [], row }: Readonly<{ filters?: ColumnFiltersState; row: AdminCustomerRow }>): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const columns = useMemo(() => buildCustomerColumns({ format, locale, t, tAdmin }), [format, locale, t, tAdmin])
  const table = useTable<DataGridFeatures, AdminCustomerRow>({
    columns,
    data: [row],
    features: dataGridFeatures,
    getRowId: (item) => item.id,
    initialState: { columnFilters: filters },
  })
  const [headerGroup] = table.getHeaderGroups()
  const [tableRow] = table.getRowModel().rows

  return (
    <div>
      <div>
        {headerGroup?.headers.map((header) => (
          <span key={header.id} data-testid={`head-${header.column.id}`}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
        ))}
      </div>
      <div>
        {tableRow?.getVisibleCells().map((cell) => (
          <span key={cell.id} data-testid={`cell-${cell.column.id}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </span>
        ))}
      </div>
    </div>
  )
}

const renderColumns = (overrides: Partial<AdminCustomerRow> = {}): void => {
  renderWithProviders(<ColumnsProbe row={customer(overrides)} />)
}

const cell = (id: string): HTMLElement => screen.getByTestId(`cell-${id}`)

afterEach(() => {
  cleanup()
})

describe("buildCustomerColumns headers", () => {
  it("translates the customer and identifier headers", () => {
    renderColumns()

    expect(screen.getByTestId("head-customer")).toHaveTextContent("Customer")
    expect(screen.getByTestId("head-recordId")).toHaveTextContent("ID")
  })

  it("translates the metric headers", () => {
    renderColumns()

    expect(screen.getByTestId("head-orderCount")).toHaveTextContent("Orders")
    expect(screen.getByTestId("head-totalSpent")).toHaveTextContent("Spent")
  })
})

describe("buildCustomerColumns cells", () => {
  it("renders the customer name", () => {
    renderColumns()

    expect(cell("customer")).toHaveTextContent("Ada Lovelace")
  })

  it("renders the raw record id", () => {
    renderColumns()

    expect(cell("recordId")).toHaveTextContent("user-1")
  })

  it("renders the stripe customer id", () => {
    renderColumns()

    expect(cell("stripeCustomerId")).toHaveTextContent("cus_123")
  })

  it("renders the order count", () => {
    renderColumns()

    expect(cell("orderCount")).toHaveTextContent("4")
  })

  it("formats the total spent from minor units", () => {
    renderColumns()

    expect(cell("totalSpent")).toHaveTextContent("398")
  })

  it("formats the joined location", () => {
    renderColumns()

    expect(cell("location")).toHaveTextContent("Warsaw")
  })

  it("falls back to a dash when the location is unknown", () => {
    renderColumns({ city: undefined, countryCode: undefined })

    expect(cell("location")).toHaveTextContent("—")
  })

  it("falls back to a dash when the customer never ordered", () => {
    renderColumns({ lastOrderAt: undefined })

    expect(cell("lastOrderAt")).toHaveTextContent("—")
  })

  it("formats the last order date", () => {
    renderColumns()

    expect(cell("lastOrderAt")).toHaveTextContent("Feb 20, 2026")
  })

  it("formats the joined date", () => {
    renderColumns()

    expect(cell("createdAt")).toHaveTextContent("Jan 15, 2026")
  })

  it("renders the row actions in their own column", () => {
    renderColumns()

    expect(cell("actions")).toHaveTextContent("row actions")
  })
})

describe("customer boolean column filtering", () => {
  it.each(["emailVerified", "banned"])("ignores an obsolete string value for the %s column", (columnId) => {
    renderWithProviders(<ColumnsProbe filters={[{ id: columnId, value: "obsolete" }]} row={customer()} />)

    expect(cell("customer")).toHaveTextContent("Ada Lovelace")
  })

  it("still removes unverified customers when a boolean verification filter is applied", () => {
    renderWithProviders(<ColumnsProbe filters={[{ id: "emailVerified", value: true }]} row={customer({ emailVerified: false })} />)

    expect(screen.queryByTestId("cell-customer")).not.toBeInTheDocument()
  })
})

describe("customer banned column filtering", () => {
  it("keeps a banned customer when the filter asks for banned accounts", () => {
    renderWithProviders(<ColumnsProbe filters={[{ id: "banned", value: true }]} row={customer({ banned: true })} />)

    expect(cell("customer")).toHaveTextContent("Ada Lovelace")
  })

  it("removes an account in good standing when the filter asks for banned accounts", () => {
    renderWithProviders(<ColumnsProbe filters={[{ id: "banned", value: true }]} row={customer({ banned: false })} />)

    expect(screen.queryByTestId("cell-customer")).not.toBeInTheDocument()
  })

  it("removes a banned account when the filter asks for accounts in good standing", () => {
    renderWithProviders(<ColumnsProbe filters={[{ id: "banned", value: false }]} row={customer({ banned: true })} />)

    expect(screen.queryByTestId("cell-customer")).not.toBeInTheDocument()
  })

  it("keeps a banned account visible while an obsolete string filter is stored", () => {
    renderWithProviders(<ColumnsProbe filters={[{ id: "banned", value: "banned" }]} row={customer({ banned: true })} />)

    expect(cell("customer")).toHaveTextContent("Ada Lovelace")
  })
})
