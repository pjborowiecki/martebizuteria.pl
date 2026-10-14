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
      <nav aria-label="breadcrumbs">{breadcrumbs?.map((crumb) => crumb.label).join("|")}</nav>
      <div data-testid="actions">{actions}</div>
    </header>
  ),
}))
vi.mock("~/src/modules/discount/use-cases/get-admin-discounts-page", () => ({ getAdminDiscountsPageQuery: () => ({ queryKey: ["page"] }) }))
vi.mock("~/src/modules/discount/use-cases/get-admin-discount-stats", () => ({ getDiscountStatsQuery: () => ({ queryKey: ["stats"] }) }))
vi.mock("~/src/presentation/components/custom/pages/admin/coupons/components/coupons-table", async () => {
  const { useCouponsSheet } = await import("~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-sheet")

  return {
    CouponsTableContent: (): JSX.Element => {
      const sheet = useCouponsSheet()

      return <section data-sheet-mode={sheet.mode} data-testid="coupons-table" />
    },
  }
})

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
  it("heads the page with the coupon title and description and no breadcrumb trail, like the customers list", () => {
    renderCouponsPage()

    expect(screen.getByRole("heading", { name: "Discount Coupons" })).toBeInTheDocument()
    expect(screen.getByText("Manage promotional codes, discounts, and free shipping offers.")).toBeInTheDocument()
    expect(screen.getByLabelText("breadcrumbs")).toBeEmptyDOMElement()
  })

  it("leaves the header free of actions, because creating a coupon belongs with the list", () => {
    renderCouponsPage()

    expect(screen.getByTestId("actions").querySelectorAll("button")).toHaveLength(0)
  })

  it("hands the coupon table a closed sheet inside the same page body as the other admin lists", () => {
    renderCouponsPage()

    const table = screen.getByTestId("coupons-table")

    expect(table).toHaveAttribute("data-sheet-mode", "closed")
    expect(table.parentElement).toHaveClass("flex", "min-h-0", "flex-1", "flex-col", "overflow-hidden", "p-8")
  })
})
