import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type User } from "~/src/modules/user/user.types"

import {
  CUSTOMER_DETAIL_FULFILLMENT_BADGE_STYLES,
  CUSTOMER_DETAIL_PAYMENT_BADGE_STYLES,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-detail.constants"
import { CustomerOrders } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-orders"

const order = (overrides: Partial<User["adminCustomerDetail"]["orders"][number]> = {}): User["adminCustomerDetail"]["orders"][number] => ({
  currencyCode: "PLN",
  date: "2 Jan 2026",
  fulfillment: "shipped",
  id: "ord_1",
  itemTitles: ["Linen shirt", "Wool cap"],
  payment: "paid",
  total: "199,00 zl",
  totalMinor: 19_900,
  ...overrides,
})

const detail = (orders: User["adminCustomerDetail"]["orders"]): User["adminCustomerDetail"] => ({
  averageOrderValue: 49_975,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: new Date(2023, 2, 4),
  customTags: [],
  email: "anna@example.com",
  emailVerified: true,
  id: "user-1",
  image: null,
  initials: "AK",
  isAnonymous: false,
  isReturning: false,
  joinDate: "4 Mar 2023",
  metadata: null,
  monthlySpending: [],
  name: "Anna Kowalska",
  orderCount: orders.length,
  orders,
  phone: null,
  returningRate: 0,
  role: ROLES.CUSTOMER,
  roleBadgeKey: "roleCustomer",
  stripeCustomerId: null,
  tags: [],
  timeline: [],
  timezone: null,
  totalSpent: 199_900,
  twoFactorEnabled: false,
  updatedAt: new Date(2024, 0, 1),
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("CustomerOrders", () => {
  it("always offers a way through to the full order list", () => {
    renderWithProviders(<CustomerOrders customer={detail([])} />)

    expect(screen.getByText("Order History")).toBeInTheDocument()
    expect(screen.getByText("View All")).toBeInTheDocument()
  })

  it("says so when the customer has never ordered", () => {
    renderWithProviders(<CustomerOrders customer={detail([])} />)

    expect(screen.getByText("No orders yet.")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("heads the table with every order column", () => {
    renderWithProviders(<CustomerOrders customer={detail([order()])} />)

    expect(screen.getByText("Order")).toBeInTheDocument()
    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Items")).toBeInTheDocument()
    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Payment")).toBeInTheDocument()
  })

  it("lists the order id, date, items and total", () => {
    renderWithProviders(<CustomerOrders customer={detail([order()])} />)

    expect(screen.getByText("ord_1")).toBeInTheDocument()
    expect(screen.getByText("2 Jan 2026")).toBeInTheDocument()
    expect(screen.getByText("Linen shirt, Wool cap")).toBeInTheDocument()
    expect(screen.getByText("199,00 zl")).toBeInTheDocument()
  })

  it("falls back to a placeholder for an order whose lines are unknown", () => {
    renderWithProviders(<CustomerOrders customer={detail([order({ itemTitles: [] })])} />)

    expect(screen.getByText(EMPTY_VALUE)).toBeInTheDocument()
  })

  it("translates the fulfillment and payment states", () => {
    renderWithProviders(<CustomerOrders customer={detail([order({ fulfillment: "delivered", payment: "refunded" })])} />)

    expect(screen.getByText("Delivered")).toBeInTheDocument()
    expect(screen.getByText("Refunded")).toBeInTheDocument()
  })

  it("colours the fulfillment badge from the shared style map", () => {
    renderWithProviders(<CustomerOrders customer={detail([order({ fulfillment: "returned" })])} />)

    expect(screen.getByText("Returned").className).toContain(CUSTOMER_DETAIL_FULFILLMENT_BADGE_STYLES["returned"])
  })

  it("colours the payment badge from the shared style map", () => {
    renderWithProviders(<CustomerOrders customer={detail([order({ payment: "authorized" })])} />)

    expect(screen.getByText("Authorized").className).toContain(CUSTOMER_DETAIL_PAYMENT_BADGE_STYLES["authorized"])
  })

  it("keeps a state the style maps do not know on a plain badge", () => {
    const missingLabel = vi.spyOn(console, "error").mockImplementation(() => {})
    renderWithProviders(<CustomerOrders customer={detail([order({ fulfillment: "on_hold", payment: "disputed" })])} />)
    const badges = [
      screen.getByText("pages.admin.customerDetail.orders.status.on_hold"),
      screen.getByText("pages.admin.customerDetail.orders.payment.disputed"),
    ]
    const knownColours = [
      ...Object.values(CUSTOMER_DETAIL_FULFILLMENT_BADGE_STYLES),
      ...Object.values(CUSTOMER_DETAIL_PAYMENT_BADGE_STYLES),
    ]

    for (const badge of badges) {
      expect(badge).toHaveClass("border-0", "text-[11px]")
      expect(badge.className).not.toContain("undefined")
      expect(knownColours.filter((colour) => badge.className.includes(colour))).toStrictEqual([])
    }
    expect(missingLabel).toHaveBeenCalled()
  })

  it("renders one row per order", () => {
    renderWithProviders(<CustomerOrders customer={detail([order(), order({ id: "ord_2" })])} />)

    expect(screen.getByText("ord_1")).toBeInTheDocument()
    expect(screen.getByText("ord_2")).toBeInTheDocument()
  })
})

it("opens the exact order selected from the customer's history", () => {
  const { router } = renderWithProviders(<CustomerOrders customer={detail([order(), order({ id: "ord_2" })])} />)
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()

  fireEvent.click(screen.getByText("ord_2"))

  expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/admin/orders/ord_2" })
})
