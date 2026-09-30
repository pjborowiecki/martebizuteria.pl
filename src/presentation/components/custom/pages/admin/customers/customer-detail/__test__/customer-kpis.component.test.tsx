import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { CustomerKpis } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-kpis"

const RETURNING_COLOR_CLASS = "text-emerald-600"

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

afterEach(() => {
  cleanup()
})

describe("CustomerKpis", () => {
  it("labels the four headline numbers", () => {
    renderWithProviders(<CustomerKpis customer={detail()} />)

    expect(screen.getByText("Total Spent")).toBeInTheDocument()
    expect(screen.getByText("Orders")).toBeInTheDocument()
    expect(screen.getByText("Average Order")).toBeInTheDocument()
    expect(screen.getByText("Returning Rate")).toBeInTheDocument()
  })

  it("renders the lifetime spend and average order as money in major units", () => {
    renderWithProviders(<CustomerKpis customer={detail()} />)

    expect(screen.getByText(/1,999\.00/u)).toBeInTheDocument()
    expect(screen.getByText(/499\.75/u)).toBeInTheDocument()
  })

  it("renders the order count as a plain number", () => {
    renderWithProviders(<CustomerKpis customer={detail({ orderCount: 12 })} />)

    expect(screen.getByText("12")).toBeInTheDocument()
  })

  it("renders a zero order count rather than leaving the tile blank", () => {
    renderWithProviders(<CustomerKpis customer={detail({ orderCount: 0 })} />)

    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("renders the returning rate as a percentage", () => {
    renderWithProviders(<CustomerKpis customer={detail({ returningRate: 100 })} />)

    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("highlights the returning rate for a repeat customer", () => {
    const { container } = renderWithProviders(<CustomerKpis customer={detail({ isReturning: true, returningRate: 100 })} />)

    expect(container.innerHTML).toContain(RETURNING_COLOR_CLASS)
  })

  it("leaves the returning rate unhighlighted for a one-off customer", () => {
    const { container } = renderWithProviders(<CustomerKpis customer={detail({ isReturning: false, returningRate: 0 })} />)

    expect(container.innerHTML).not.toContain(RETURNING_COLOR_CLASS)
  })
})
