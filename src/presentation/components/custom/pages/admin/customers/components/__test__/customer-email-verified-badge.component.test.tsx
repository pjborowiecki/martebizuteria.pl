import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CustomerEmailVerifiedBadge } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-email-verified-badge"

afterEach(() => {
  cleanup()
})

describe("CustomerEmailVerifiedBadge", () => {
  it("reads Yes for a verified email", () => {
    renderWithProviders(<CustomerEmailVerifiedBadge emailVerified />)

    expect(screen.getByText("Yes")).toBeInTheDocument()
  })

  it("reads No for an unverified email", () => {
    renderWithProviders(<CustomerEmailVerifiedBadge emailVerified={false} />)

    expect(screen.getByText("No")).toBeInTheDocument()
  })

  it("styles a verified email as the healthy state", () => {
    renderWithProviders(<CustomerEmailVerifiedBadge emailVerified />)

    expect(screen.getByText("Yes").className).toContain("emerald")
  })

  it("styles an unverified email as the unhealthy state, the opposite of the ban badge", () => {
    renderWithProviders(<CustomerEmailVerifiedBadge emailVerified={false} />)

    expect(screen.getByText("No").className).toContain("amber")
  })
})
