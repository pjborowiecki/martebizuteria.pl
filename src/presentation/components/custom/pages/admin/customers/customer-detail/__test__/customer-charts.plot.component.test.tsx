import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { CustomerCharts } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts"

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

const withSpending = () =>
  renderWithProviders(
    <CustomerCharts
      customer={detail({
        monthlySpending: [
          { amount: 0, month: "Jan" },
          { amount: 500_000, month: "Feb" },
          { amount: 1_000_000, month: "Mar" },
        ],
      })}
    />,
  )

afterEach(cleanup)

describe("CustomerCharts spending plot", () => {
  it("draws a month label for every point in the series", () => {
    withSpending()

    expect(screen.getByText("Jan")).toBeInTheDocument()
    expect(screen.getByText("Feb")).toBeInTheDocument()
    expect(screen.getByText("Mar")).toBeInTheDocument()
  })

  it("labels the value axis in thousands of the store currency", () => {
    const { container } = withSpending()
    const ticks = [...container.querySelectorAll("text")].map((node) => node.textContent)

    expect(ticks).toContain("PLN 10k")
    expect(ticks).toContain("PLN 0k")
  })

  it("rounds the axis labels to whole thousands", () => {
    const { container } = withSpending()
    const ticks = [...container.querySelectorAll("text")].map((node) => node.textContent)

    expect(ticks.filter((tick) => tick.endsWith("k")).every((tick) => !tick.includes("."))).toBe(true)
  })

  it("fades the area under the curve with its own gradient", () => {
    const { container } = withSpending()

    expect(container.querySelector("#spending-fill")?.tagName).toBe("linearGradient")
    expect(container.querySelectorAll("#spending-fill stop")).toHaveLength(2)
  })

  it("paints the area with that gradient", () => {
    const { container } = withSpending()

    expect(container.querySelector("path.recharts-area-area")?.getAttribute("fill")).toBe("url(#spending-fill)")
  })
})

describe("CustomerCharts category plot", () => {
  it("names every category on the vertical axis", () => {
    const { container } = renderWithProviders(
      <CustomerCharts
        customer={detail({
          categoryBreakdown: [
            { amount: 19_900, category: "Rings" },
            { amount: 9900, category: "Necklaces" },
          ],
        })}
      />,
    )
    const labels = [...container.querySelectorAll("text")].map((node) => node.textContent)

    expect(labels).toContain("Rings")
    expect(labels).toContain("Necklaces")
  })
})
