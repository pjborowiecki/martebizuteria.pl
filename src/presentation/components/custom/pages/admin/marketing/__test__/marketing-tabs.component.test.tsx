import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { MarketingTabs } from "~/src/presentation/components/custom/pages/admin/marketing/marketing-tabs"

afterEach(cleanup)

describe("MarketingTabs", () => {
  it("links the newsletters and their subscribers in a fixed order", () => {
    renderWithProviders(<MarketingTabs active="newsletters" />)

    expect(screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toStrictEqual([
      ["Newsletters", "/admin/marketing"],
      ["Subscribers", "/admin/marketing/subscribers"],
    ])
  })

  it.each([
    ["newsletters", "Newsletters", "Subscribers"],
    ["subscribers", "Subscribers", "Newsletters"],
  ] as const)("marks only the %s tab as current", (active, current, other) => {
    renderWithProviders(<MarketingTabs active={active} />)

    expect(screen.getByRole("link", { name: current }).className).toContain("font-medium")
    expect(screen.getByRole("link", { name: current }).querySelector("span")).not.toBeNull()
    expect(screen.getByRole("link", { name: other }).className).toContain("text-muted-foreground")
    expect(screen.getByRole("link", { name: other }).querySelector("span")).toBeNull()
  })
})
