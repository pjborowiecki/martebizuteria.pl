import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({
    actions,
    breadcrumbs,
    description,
    title,
  }: Readonly<{
    actions?: ReactNode
    breadcrumbs?: readonly { href?: string; label: string }[]
    description?: string
    title: ReactNode
  }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <nav aria-label="breadcrumbs">{(breadcrumbs ?? []).map((crumb) => `${crumb.label}:${crumb.href ?? ""}`).join("|")}</nav>
      <div data-testid="actions">{actions}</div>
    </header>
  ),
}))
vi.mock("~/src/modules/discount/use-cases/get-admin-discounts-page", () => ({ getAdminDiscountsPageQuery: () => ({ queryKey: ["page"] }) }))
vi.mock("~/src/modules/discount/use-cases/get-admin-discount-stats", () => ({ getDiscountStatsQuery: () => ({ queryKey: ["stats"] }) }))
vi.mock("~/src/presentation/components/custom/pages/admin/coupons/coupon-stats", () => ({
  CouponStats: (): JSX.Element => <section data-testid="coupon-stats" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/coupons/coupon-list-table", () => ({
  CouponListTable: (): JSX.Element => <section data-testid="coupon-list-table" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/admin.coupons"

const renderCouponsPage = () => {
  const CouponsPage = Route.options.component
  if (CouponsPage === undefined) {
    throw new Error("the admin coupons route registered no component")
  }

  return renderWithProviders(<CouponsPage />)
}

afterEach(cleanup)

describe("the admin coupons page", () => {
  it("heads the page with the coupon title and description", () => {
    renderCouponsPage()

    expect(screen.getByRole("heading", { name: "Discount Coupons" })).toBeInTheDocument()
    expect(screen.getByText("Manage promotional codes, discounts, and free shipping offers.")).toBeInTheDocument()
  })

  it("links the breadcrumb trail back to the dashboard", () => {
    renderCouponsPage()

    expect(screen.getByLabelText("breadcrumbs")).toHaveTextContent("Dashboard:/admin")
  })

  it("leaves the header free of actions, because creating a coupon belongs with the list", () => {
    renderCouponsPage()

    expect(screen.getByTestId("actions").querySelectorAll("button")).toHaveLength(0)
  })

  it("shows the coupon stats above the coupon list", () => {
    renderCouponsPage()

    const stats = screen.getByTestId("coupon-stats")
    const table = screen.getByTestId("coupon-list-table")

    expect(stats.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
