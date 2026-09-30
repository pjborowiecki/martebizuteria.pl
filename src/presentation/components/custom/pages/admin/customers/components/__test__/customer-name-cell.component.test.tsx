import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { CustomerNameCell } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-name-cell"

const customer = (overrides: Partial<User["adminCustomerListItem"]> = {}): User["adminCustomerListItem"] => ({
  averageOrderValue: 0,
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: new Date(2024, 0, 1),
  email: "anna@example.com",
  emailVerified: true,
  id: "user-1",
  image: null,
  isAnonymous: false,
  metadata: null,
  name: "Anna Kowalska",
  orderCount: 0,
  phone: null,
  role: ROLES.CUSTOMER,
  stripeCustomerId: null,
  timezone: null,
  totalSpent: 0,
  twoFactorEnabled: false,
  updatedAt: new Date(2024, 0, 1),
  ...overrides,
})

afterEach(() => {
  cleanup()
})

describe("CustomerNameCell", () => {
  it("shows the customer's name and email together", () => {
    renderWithProviders(<CustomerNameCell customer={customer()} />)

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("anna@example.com")).toBeInTheDocument()
  })

  it("falls back to initials because there is no avatar image", () => {
    renderWithProviders(<CustomerNameCell customer={customer()} />)

    expect(screen.getByText("AK")).toBeInTheDocument()
  })

  it("derives the initials from a single name", () => {
    renderWithProviders(<CustomerNameCell customer={customer({ name: "Cher" })} />)

    expect(screen.getByText("CH")).toBeInTheDocument()
  })

  it("shows a placeholder initial for a nameless account", () => {
    renderWithProviders(<CustomerNameCell customer={customer({ name: "" })} />)

    expect(screen.getByText("?")).toBeInTheDocument()
  })
})
