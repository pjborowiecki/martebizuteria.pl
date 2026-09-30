import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { CustomerRoleBadge } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-role-badge"

afterEach(() => {
  cleanup()
})

describe("CustomerRoleBadge", () => {
  it("labels an administrator", () => {
    renderWithProviders(<CustomerRoleBadge role={ROLES.ADMIN} />)

    expect(screen.getByText("Admin")).toBeInTheDocument()
  })

  it("labels a shopper", () => {
    renderWithProviders(<CustomerRoleBadge role={ROLES.CUSTOMER} />)

    expect(screen.getByText("Customer")).toBeInTheDocument()
  })

  it("gives the administrator badge the emphasised treatment", () => {
    renderWithProviders(<CustomerRoleBadge role={ROLES.ADMIN} />)

    expect(screen.getByText("Admin").className).toContain("bg-foreground")
  })

  it("gives the shopper badge the muted treatment", () => {
    renderWithProviders(<CustomerRoleBadge role={ROLES.CUSTOMER} />)

    expect(screen.getByText("Customer").className).toContain("bg-secondary")
  })
})
