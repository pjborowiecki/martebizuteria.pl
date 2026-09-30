import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { MarketingEngagementChart } from "~/src/presentation/components/custom/pages/admin/marketing/marketing-engagement-chart"

describe("MarketingEngagementChart", () => {
  afterEach(cleanup)

  it("translates the card title and description", () => {
    renderWithProviders(<MarketingEngagementChart />)

    expect(screen.getByText("Campaign Engagement")).toBeInTheDocument()
    expect(screen.getByText("Showing average open rate and click rate for recent months")).toBeInTheDocument()
  })

  it("publishes a colour variable for each configured series", () => {
    const { container } = renderWithProviders(<MarketingEngagementChart />)
    const style = container.querySelector("style")?.textContent ?? ""

    expect(style).toContain("--color-openRate: oklch(0.6 0.118 184.704);")
    expect(style).toContain("--color-clickRate: oklch(0.398 0.07 227.392);")
  })

  it("scopes the colour variables to this chart only", () => {
    const { container } = renderWithProviders(<MarketingEngagementChart />)

    expect(container.querySelector("[data-chart]")).not.toBeNull()
    expect(container.querySelector("style")?.textContent).toMatch(/\[data-chart=chart-[\w-]+\]/u)
  })

  it("declares the separate gradients the two areas fill with", () => {
    const { container } = renderWithProviders(<MarketingEngagementChart />)

    expect([...container.querySelectorAll("linearGradient")].map((gradient) => gradient.id)).toStrictEqual(["fillOpen", "fillClick"])
  })
})
