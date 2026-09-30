import { type JSX, useMemo } from "react"

import { type Table, useTable } from "@tanstack/react-table"
import { act, cleanup } from "@testing-library/react"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-row-actions", () => ({
  CustomersRowActions: () => <span>row actions</span>,
}))

import { buildCustomerColumns } from "~/src/presentation/components/custom/pages/admin/customers/lib/customers-column-defs"

type AdminCustomerRow = User["adminCustomerListItem"]

type CustomersTable = Table<DataGridFeatures, AdminCustomerRow>

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
  id: "user-verified",
  image: null,
  isAnonymous: false,
  lastOrderAt: undefined,
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

const ROWS: AdminCustomerRow[] = [
  customer(),
  customer({ banned: true, emailVerified: false, id: "user-banned", phone: null, stripeCustomerId: null }),
  customer({ banned: null, city: undefined, countryCode: undefined, emailVerified: false, id: "user-plain", province: undefined }),
]

const TableProbe = ({ onTable }: Readonly<{ onTable: (table: CustomersTable) => void }>): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const columns = useMemo(() => buildCustomerColumns({ format, locale, t, tAdmin }), [format, locale, t, tAdmin])
  const table = useTable<DataGridFeatures, AdminCustomerRow>({
    columns,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  onTable(table)

  return <span>customers table</span>
}

const seen: { table?: CustomersTable } = {}

const filteredIds = (): string[] => seen.table?.getFilteredRowModel().rows.map((row) => row.id) ?? []

const value = (rowId: string, columnId: string): unknown => seen.table?.getRow(rowId).getValue(columnId)

beforeEach(() => {
  renderWithProviders(
    <TableProbe
      onTable={(table) => {
        seen.table = table
      }}
    />,
  )
})

afterEach(() => {
  cleanup()
  delete seen.table
})

describe("customer column values", () => {
  it("reads the record id straight from the row", () => {
    expect(value("user-verified", ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId)).toBe("user-verified")
  })

  it("reads the stripe customer id, or an empty value when the customer has none", () => {
    expect(value("user-verified", ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId)).toBe("cus_123")
    expect(value("user-banned", ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId)).toBe("")
  })

  it("reads the phone number, or an empty value when the customer has none", () => {
    expect(value("user-verified", ADMIN_CUSTOMER_TABLE_COLUMN_ID.phone)).toBe("+48 123 456 789")
    expect(value("user-banned", ADMIN_CUSTOMER_TABLE_COLUMN_ID.phone)).toBe("")
  })

  it("joins the city, the province and the country into the sortable location", () => {
    expect(value("user-verified", ADMIN_CUSTOMER_TABLE_COLUMN_ID.location)).toBe("Warsaw, Mazowieckie, PL")
  })

  it("leaves the location empty when the customer stored no address", () => {
    expect(value("user-plain", ADMIN_CUSTOMER_TABLE_COLUMN_ID.location)).toBe("")
  })
})

describe("customer email verification filter", () => {
  it("keeps every customer while no boolean is selected", () => {
    act(() => {
      seen.table?.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified)?.setFilterValue("all")
    })

    expect(filteredIds()).toStrictEqual(["user-verified", "user-banned", "user-plain"])
  })

  it("keeps the verified customers only", () => {
    act(() => {
      seen.table?.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified)?.setFilterValue(true)
    })

    expect(filteredIds()).toStrictEqual(["user-verified"])
  })

  it("keeps the unverified customers only", () => {
    act(() => {
      seen.table?.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified)?.setFilterValue(false)
    })

    expect(filteredIds()).toStrictEqual(["user-banned", "user-plain"])
  })
})

describe("customer ban filter", () => {
  it("keeps every customer while no boolean is selected", () => {
    act(() => {
      seen.table?.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned)?.setFilterValue(undefined)
    })

    expect(filteredIds()).toStrictEqual(["user-verified", "user-banned", "user-plain"])
  })

  it("keeps the banned customers only", () => {
    act(() => {
      seen.table?.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned)?.setFilterValue(true)
    })

    expect(filteredIds()).toStrictEqual(["user-banned"])
  })

  it("treats a customer whose ban flag was never set as not banned", () => {
    act(() => {
      seen.table?.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned)?.setFilterValue(false)
    })

    expect(filteredIds()).toStrictEqual(["user-verified", "user-plain"])
  })
})
