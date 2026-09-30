import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DashboardOverviewFallback } from "~/src/presentation/components/custom/pages/admin/dashboard-overview-fallback"

const render = () => renderWithProviders(<DashboardOverviewFallback />)

afterEach(cleanup)

describe("DashboardOverviewFallback", () => {
  it("stands in for the four headline stat cards", () => {
    const { container } = render()
    const statRow = container.querySelector(String.raw`div.xl\:grid-cols-4`)

    expect(statRow?.querySelectorAll("div[data-slot='card']")).toHaveLength(4)
  })

  it("lays out every card the loaded overview shows", () => {
    const { container } = render()

    expect(container.querySelectorAll("div[data-slot='card']")).toHaveLength(10)
  })

  it("reserves the height of the main revenue chart", () => {
    const { container } = render()
    const heights = [...container.querySelectorAll("div[data-slot='skeleton']")].map((node) => node.className)

    expect(heights.some((className) => className.includes("h-[280px]"))).toBe(true)
    expect(heights.some((className) => className.includes("h-[220px]"))).toBe(true)
  })

  it("shows nothing the admin could read or press while the data loads", () => {
    const { container } = render()

    expect(container.textContent).toBe("")
    expect(container.querySelectorAll("button, input, a")).toHaveLength(0)
  })
})
