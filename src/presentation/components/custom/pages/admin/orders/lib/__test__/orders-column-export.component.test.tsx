import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { formatAdminOrderDate } from "~/src/modules/order/order.utils"

import { buildOrderColumns } from "~/src/presentation/components/custom/pages/admin/orders/lib/orders-column-defs"

vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-row-actions", () => ({
  OrdersRowActions: (): JSX.Element => <output />,
}))

afterEach(cleanup)

const CREATED_AT = new Date(Date.UTC(2026, 9, 16, 12, 30))

const orderRow = (overrides: Partial<Order["adminListItem"]> = {}): Order["adminListItem"] => ({
  billingCompanyName: "Pracownia Złotnicza sp. z o.o.",
  billingNip: "5260001246",
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  destination: "Paczkomat InPost: WAW01M",
  email: "anna@example.com",
  emailedSteps: [],
  fulfillmentStatus: "shipped",
  fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED,
  hasOpenDispute: false,
  id: "order-1",
  initials: "AK",
  itemCount: 3,
  orderNumber: "MRT-2026-00042",
  paymentUiKey: "paid",
  status: "processing",
  totalMinorUnits: 49_800,
  userId: "user-1",
  ...overrides,
})

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exportValueOf = (id: string, overrides: Partial<Order["adminListItem"]> = {}): string | undefined => {
  const { result } = renderHook(
    () => {
      const t = useTranslations("pages.admin.orders")
      const tAdmin = useTranslations("pages.admin")

      return buildOrderColumns({ formatLocale: "pl-PL", t, tAdmin, timeZone: "Europe/Warsaw" })
    },
    { wrapper: Wrapper },
  )

  return result.current.find((column) => column.id === id)?.meta?.exportValue?.(orderRow(overrides))
}

describe("buildOrderColumns export values", () => {
  it.each([
    [ADMIN_ORDER_TABLE_COLUMN_ID.orderId, "MRT-2026-00042"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.customer, "Anna Kowalska"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.email, "anna@example.com"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.itemCount, "3"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment, "Shipped"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.status, "Open"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.payment, "Paid"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.companyName, "Pracownia Złotnicza sp. z o.o."],
    [ADMIN_ORDER_TABLE_COLUMN_ID.nip, "5260001246"],
    [ADMIN_ORDER_TABLE_COLUMN_ID.destination, "Paczkomat InPost: WAW01M"],
  ])("exports the %s column as the text its cell shows", (id, text) => {
    expect(exportValueOf(id)).toBe(text)
  })

  it("dates the order in the admin's format locale and time zone", () => {
    expect(exportValueOf(ADMIN_ORDER_TABLE_COLUMN_ID.createdAt)).toBe(
      formatAdminOrderDate(CREATED_AT, { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" }),
    )
  })

  it("prices the order in its currency and the admin's format locale", () => {
    expect(exportValueOf(ADMIN_ORDER_TABLE_COLUMN_ID.total)).toBe(formatPrice(49_800, "PLN", "pl-PL"))
  })

  it("leaves the company, the NIP and the destination empty for an order without them", () => {
    const withoutBilling = { billingCompanyName: undefined, billingNip: undefined, destination: undefined }

    expect(exportValueOf(ADMIN_ORDER_TABLE_COLUMN_ID.companyName, withoutBilling)).toBeUndefined()
    expect(exportValueOf(ADMIN_ORDER_TABLE_COLUMN_ID.nip, withoutBilling)).toBeUndefined()
    expect(exportValueOf(ADMIN_ORDER_TABLE_COLUMN_ID.destination, withoutBilling)).toBeUndefined()
  })

  it("never exports the selection or the row actions", () => {
    expect(exportValueOf(ADMIN_ORDER_TABLE_COLUMN_ID.select)).toBeUndefined()
    expect(exportValueOf(ADMIN_ORDER_TABLE_COLUMN_ID.actions)).toBeUndefined()
  })
})
