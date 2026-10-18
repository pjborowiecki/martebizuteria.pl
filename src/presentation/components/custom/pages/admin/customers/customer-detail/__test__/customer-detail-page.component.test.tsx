import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { CustomerDetailPage } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-detail-page"

vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-kpis", () => ({
  CustomerKpis: (): JSX.Element => <p>customer kpis</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts", () => ({
  CustomerCharts: (): JSX.Element => <p>customer charts</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-orders", () => ({
  CustomerOrders: (): JSX.Element => <p>customer orders</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-sidebar", () => ({
  CustomerSidebar: (): JSX.Element => <aside>customer sidebar</aside>,
}))

const customer: User["adminCustomerDetail"] = {
  averageOrderValue: 49_975,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: new Date("2023-03-04T00:00:00.000Z"),
  customTags: [],
  email: "anna@example.com",
  emailHistory: [],
  emailVerified: true,
  formatLocale: null,
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
  phone: null,
  returningRate: 0,
  role: ROLES.CUSTOMER,
  roleBadgeKey: "roleCustomer",
  signedInOrderCount: 1,
  stripeCustomerId: null,
  tags: [],
  timeline: [],
  timezone: null,
  totalSpent: 199_900,
  twoFactorEnabled: false,
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
}

const renderPage = () => renderWithProviders(<CustomerDetailPage customer={customer} />)

afterEach(cleanup)

describe("CustomerDetailPage", () => {
  it("stacks the kpis, charts and orders in the main column next to the sidebar", () => {
    renderPage()
    const mainColumn = screen.getByText("customer orders").parentElement

    expect(mainColumn).toContainElement(screen.getByText("customer kpis"))
    expect(mainColumn).toContainElement(screen.getByText("customer charts"))
    expect(mainColumn?.nextElementSibling).toBe(screen.getByText("customer sidebar"))
  })

  it("holds the page to the height of a wide, tall screen instead of scrolling it as a whole", () => {
    const { container } = renderPage()
    const body = container.firstElementChild
    const columns = body?.firstElementChild

    expect(body).toHaveClass(
      "flex-1",
      "min-h-0",
      "2xl:[@media(min-height:57rem)]:flex",
      "2xl:[@media(min-height:57rem)]:flex-col",
      "2xl:[@media(min-height:57rem)]:overflow-hidden",
    )
    expect(columns).toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_340px]",
      "2xl:[@media(min-height:57rem)]:min-h-0",
      "2xl:[@media(min-height:57rem)]:flex-1",
      "2xl:[@media(min-height:57rem)]:grid-rows-[minmax(0,1fr)]",
    )
  })

  it("keeps the main column to the screen on a wide, tall screen so only the order history scrolls inside it", () => {
    renderPage()

    expect(screen.getByText("customer orders").parentElement).toHaveClass(
      "flex",
      "min-w-0",
      "flex-col",
      "2xl:[@media(min-height:57rem)]:min-h-0",
      "2xl:[@media(min-height:57rem)]:overflow-y-auto",
    )
  })

  it("scrolls the page as a whole on narrower or shorter screens without trapping the scroll in a column", () => {
    const { container } = renderPage()

    expect(container.firstElementChild).toHaveClass("lg:overflow-y-auto")
    expect(container.firstElementChild).not.toHaveClass("overflow-hidden", "xl:overflow-hidden")
    expect(screen.getByText("customer orders").parentElement).not.toHaveClass("overflow-y-auto", "xl:overflow-y-auto")
  })
})
