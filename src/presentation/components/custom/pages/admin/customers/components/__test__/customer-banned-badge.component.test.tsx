import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CustomerBannedBadge } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-banned-badge"

afterEach(() => {
  cleanup()
})

describe("CustomerBannedBadge", () => {
  it("reads Yes for a banned account", () => {
    renderWithProviders(<CustomerBannedBadge banned />)

    expect(screen.getByText("Yes")).toBeInTheDocument()
  })

  it("reads No for an account in good standing", () => {
    renderWithProviders(<CustomerBannedBadge banned={false} />)

    expect(screen.getByText("No")).toBeInTheDocument()
  })

  it("styles a ban as the unhealthy state", () => {
    renderWithProviders(<CustomerBannedBadge banned />)

    expect(screen.getByText("Yes").className).toContain("amber")
  })

  it("styles an unbanned account as the healthy state", () => {
    renderWithProviders(<CustomerBannedBadge banned={false} />)

    expect(screen.getByText("No").className).toContain("emerald")
  })
})
