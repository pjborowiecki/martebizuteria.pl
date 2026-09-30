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
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/marketing-stats", () => ({
  MarketingStats: (): JSX.Element => <section data-testid="marketing-stats" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/marketing-engagement-chart", () => ({
  MarketingEngagementChart: (): JSX.Element => <section data-testid="marketing-engagement-chart" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/marketing-campaigns-table", () => ({
  MarketingCampaignsTable: (): JSX.Element => <section data-testid="marketing-campaigns-table" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/admin.marketing"

const renderMarketingPage = () => {
  const MarketingPage = Route.options.component
  if (MarketingPage === undefined) {
    throw new Error("the admin marketing route registered no component")
  }

  return renderWithProviders(<MarketingPage />)
}

afterEach(() => {
  cleanup()
})

describe("admin marketing page", () => {
  it("heads the page with the translated title and description", () => {
    renderMarketingPage()

    expect(screen.getByRole("heading", { name: "Marketing Campaigns" })).toBeInTheDocument()
    expect(screen.getByText("Manage promotional campaigns, track impressions, click rates, and conversions.")).toBeInTheDocument()
  })

  it("links the breadcrumb trail back to the dashboard", () => {
    renderMarketingPage()

    expect(screen.getByLabelText("breadcrumbs")).toHaveTextContent("Dashboard:/admin")
  })

  it("offers a new campaign action in the header", () => {
    renderMarketingPage()

    expect(screen.getByRole("button", { name: /New Campaign/u })).toBeInTheDocument()
    expect(screen.getByTestId("actions").querySelectorAll("button")).toHaveLength(2)
  })

  it("stacks the stats, the engagement chart and the campaigns table in that order", () => {
    renderMarketingPage()

    const stats = screen.getByTestId("marketing-stats")
    const chart = screen.getByTestId("marketing-engagement-chart")
    const table = screen.getByTestId("marketing-campaigns-table")

    expect(stats.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(chart.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
