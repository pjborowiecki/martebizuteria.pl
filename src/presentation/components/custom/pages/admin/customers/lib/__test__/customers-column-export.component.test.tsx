import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { buildCustomerColumns } from "~/src/presentation/components/custom/pages/admin/customers/lib/customers-column-defs"

vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-row-actions", () => ({
  CustomersRowActions: (): JSX.Element => <span />,
}))

afterEach(cleanup)

type AdminCustomerRow = User["adminCustomerListItem"]

const CREATED_AT = new Date("2026-01-15T10:00:00.000Z")

const LAST_ORDER_AT = new Date("2026-10-02T10:00:00.000Z")

const customer = (overrides: Partial<AdminCustomerRow> = {}): AdminCustomerRow => ({
  averageOrderValue: 9950,
  banExpires: null,
  banReason: null,
  banned: false,
  city: "Kraków",
  countryCode: "PL",
  createdAt: CREATED_AT,
  email: "anna@example.com",
  emailVerified: true,
  formatLocale: null,
  id: "user-1",
  image: null,
  isAnonymous: false,
  lastOrderAt: LAST_ORDER_AT,
  metadata: null,
  name: "Anna Kowalska",
  orderCount: 4,
  phone: "+48 600 100 200",
  province: "Małopolskie",
  role: "customer",
  stripeCustomerId: "cus_123",
  timezone: null,
  totalSpent: 39_800,
  twoFactorEnabled: false,
  updatedAt: CREATED_AT,
  ...overrides,
})

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exported = (overrides: Partial<AdminCustomerRow> = {}) => {
  const { result } = renderHook(
    () => {
      const t = useTranslations("pages.admin.customers")
      const tAdmin = useTranslations("pages.admin")
      const format = useFormatter()

      return {
        columns: buildCustomerColumns({ format, formatLocale: "pl-PL", t, tAdmin, timeZone: "Europe/Warsaw" }),
        medium: (date: Date) => format.dateTime(date, { dateStyle: "medium" }),
      }
    },
    { wrapper: Wrapper },
  )
  const row = customer(overrides)

  return {
    medium: result.current.medium,
    valueOf: (id: string): string | undefined => result.current.columns.find((column) => column.id === id)?.meta?.exportValue?.(row),
  }
}

describe("buildCustomerColumns export values", () => {
  it.each([
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.customer, "Anna Kowalska"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.email, "anna@example.com"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId, "user-1"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId, "cus_123"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.role, "Customer"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.phone, "+48 600 100 200"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified, "Yes"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned, "No"],
    [ADMIN_CUSTOMER_TABLE_COLUMN_ID.orderCount, "4"],
  ])("exports the %s column as the text its cell shows", (id, text) => {
    expect(exported().valueOf(id)).toBe(text)
  })

  it("names the location the way the table shows it", () => {
    expect(exported().valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.location)).toMatch(/^Kraków, Małopolskie/u)
  })

  it("writes the money columns in the shop currency and the admin's format locale", () => {
    const { valueOf } = exported()

    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent)).toBe(formatPrice(39_800, "PLN", "pl-PL"))
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue)).toBe(formatPrice(9950, "PLN", "pl-PL"))
  })

  it("writes the dates in the admin's format", () => {
    const { medium, valueOf } = exported()

    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt)).toBe(medium(LAST_ORDER_AT))
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt)).toBe(medium(CREATED_AT))
  })

  it("names an admin, a banned account and an unverified address", () => {
    const { valueOf } = exported({ banned: true, emailVerified: false, role: "admin" })

    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.role)).toBe("Admin")
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned)).toBe("Yes")
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified)).toBe("No")
  })

  it("leaves out what the customer never gave or never did", () => {
    const { valueOf } = exported({ city: undefined, lastOrderAt: undefined, phone: null, stripeCustomerId: null })

    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.phone)).toBeUndefined()
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId)).toBeUndefined()
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.location)).toBeUndefined()
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt)).toBeUndefined()
  })

  it("never exports the selection or the row actions", () => {
    const { valueOf } = exported()

    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.select)).toBeUndefined()
    expect(valueOf(ADMIN_CUSTOMER_TABLE_COLUMN_ID.actions)).toBeUndefined()
  })
})
