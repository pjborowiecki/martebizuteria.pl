import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { CustomerCharts } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts"

const SPENDING_EMPTY = "No completed orders in the last 12 months."

const CATEGORY_EMPTY = "No category spending data yet."

const detail = (overrides: Partial<User["adminCustomerDetail"]> = {}): User["adminCustomerDetail"] => ({
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
  orderCount: 4,
  orders: [],
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
  ...overrides,
})

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("CustomerCharts headings", () => {
  it("titles both cards and explains the spending window", () => {
    renderWithProviders(<CustomerCharts customer={detail()} />)

    expect(screen.getByText("Spending Activity")).toBeInTheDocument()
    expect(screen.getByText("Monthly spending over the last 12 months")).toBeInTheDocument()
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument()
  })
})

describe("CustomerCharts spending card", () => {
  it("says so when there is nothing to plot", () => {
    renderWithProviders(<CustomerCharts customer={detail()} />)

    expect(screen.getByText(SPENDING_EMPTY)).toBeInTheDocument()
  })

  it("treats twelve months of zeroes as nothing to plot", () => {
    renderWithProviders(
      <CustomerCharts
        customer={detail({
          monthlySpending: [
            { amount: 0, month: "Jan" },
            { amount: 0, month: "Feb" },
          ],
        })}
      />,
    )

    expect(screen.getByText(SPENDING_EMPTY)).toBeInTheDocument()
  })

  it("plots the series as soon as one month has spending", () => {
    renderWithProviders(
      <CustomerCharts
        customer={detail({
          monthlySpending: [
            { amount: 0, month: "Jan" },
            { amount: 19_900, month: "Feb" },
          ],
        })}
      />,
    )

    expect(screen.queryByText(SPENDING_EMPTY)).not.toBeInTheDocument()
  })
})

describe("CustomerCharts category card", () => {
  it("says so when no category has any spending", () => {
    renderWithProviders(<CustomerCharts customer={detail()} />)

    expect(screen.getByText(CATEGORY_EMPTY)).toBeInTheDocument()
  })

  it("plots the breakdown once a category is present", () => {
    renderWithProviders(<CustomerCharts customer={detail({ categoryBreakdown: [{ amount: 19_900, category: "Shirts" }] })} />)

    expect(screen.queryByText(CATEGORY_EMPTY)).not.toBeInTheDocument()
  })

  it("keeps the two cards independent of one another", () => {
    renderWithProviders(<CustomerCharts customer={detail({ categoryBreakdown: [{ amount: 19_900, category: "Shirts" }] })} />)

    expect(screen.getByText(SPENDING_EMPTY)).toBeInTheDocument()
    expect(screen.queryByText(CATEGORY_EMPTY)).not.toBeInTheDocument()
  })
})
