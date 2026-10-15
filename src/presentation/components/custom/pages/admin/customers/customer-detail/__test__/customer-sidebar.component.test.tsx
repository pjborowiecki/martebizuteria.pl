import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { ADMIN_CUSTOMER_DETAIL_TAGS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { CustomerSidebar } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-sidebar"

const detail = (overrides: Partial<User["adminCustomerDetail"]> = {}): User["adminCustomerDetail"] => ({
  averageOrderValue: 49_975,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: new Date(2023, 2, 4),
  customTags: [],
  email: "anna@example.com",
  emailVerified: true,
  id: "user-1",
  image: null,
  initials: "AK",
  isAnonymous: false,
  isReturning: false,
  joinDate: "4 Mar 2023",
  metadata: null,
  monthlySpending: [],
  name: "Anna Kowalska",
  orderCount: 4,
  phone: null,
  returningRate: 0,
  role: ROLES.CUSTOMER,
  roleBadgeKey: "roleCustomer",
  stripeCustomerId: null,
  tags: [],
  timeline: [],
  timezone: null,
  totalSpent: 199_900,
  twoFactorEnabled: false,
  updatedAt: new Date(2024, 0, 1),
  ...overrides,
})

afterEach(() => {
  cleanup()
})

describe("CustomerSidebar profile", () => {
  it("identifies the customer by initials, name and id", () => {
    renderWithProviders(<CustomerSidebar customer={detail()} />)

    expect(screen.getByText("AK")).toBeInTheDocument()
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("user-1")).toBeInTheDocument()
  })

  it("translates the role badge key through the customers messages", () => {
    renderWithProviders(<CustomerSidebar customer={detail({ roleBadgeKey: "roleAdmin" })} />)

    expect(screen.getByText("Admin")).toBeInTheDocument()
  })

  it("uses the detail page's own wording for the returning badge", () => {
    renderWithProviders(<CustomerSidebar customer={detail({ roleBadgeKey: "returning" })} />)

    expect(screen.getByText("Returning")).toBeInTheDocument()
  })

  it("states when the account was created", () => {
    renderWithProviders(<CustomerSidebar customer={detail()} />)

    expect(screen.getByText("Account created: 4 Mar 2023")).toBeInTheDocument()
  })

  it("shows the contact details it has", () => {
    renderWithProviders(
      <CustomerSidebar
        customer={detail({
          address: "Krucza 12/4, 00-548 Warszawa, PL",
          lastActive: "2 hours ago",
          phone: "+48512345678",
          preferredCategory: "Shirts",
          preferredCollection: "Spring 2026",
        })}
      />,
    )

    expect(screen.getByText("anna@example.com")).toHaveAttribute("title", "anna@example.com")
    expect(screen.getByText("+48512345678")).toBeInTheDocument()
    expect(screen.getByText("Krucza 12/4, 00-548 Warszawa, PL")).toBeInTheDocument()
    expect(screen.getByText("Last active 2 hours ago")).toBeInTheDocument()
    expect(screen.getByText("Shirts")).toBeInTheDocument()
    expect(screen.getByText("Spring 2026")).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_VALUE)).not.toBeInTheDocument()
  })

  it("falls back to a placeholder for every contact detail it lacks", () => {
    renderWithProviders(<CustomerSidebar customer={detail()} />)

    expect(screen.getAllByText(EMPTY_VALUE)).toHaveLength(5)
  })

  it("treats a blank phone number as no phone at all", () => {
    renderWithProviders(
      <CustomerSidebar
        customer={detail({
          address: "Krucza 12/4",
          lastActive: "2 hours ago",
          phone: "   ",
          preferredCategory: "Shirts",
          preferredCollection: "Spring 2026",
        })}
      />,
    )

    expect(screen.getAllByText(EMPTY_VALUE)).toHaveLength(1)
  })
})

describe("CustomerSidebar tags", () => {
  it("says so when the customer carries no tags at all", () => {
    renderWithProviders(<CustomerSidebar customer={detail()} />)

    expect(screen.getByText("No tags for this customer.")).toBeInTheDocument()
  })

  it("translates the system tags and groups them under their own heading", () => {
    renderWithProviders(
      <CustomerSidebar customer={detail({ tags: [ADMIN_CUSTOMER_DETAIL_TAGS.VERIFIED, ADMIN_CUSTOMER_DETAIL_TAGS.BANNED] })} />,
    )

    expect(screen.getByText("System")).toBeInTheDocument()
    expect(screen.getByText("Verified")).toBeInTheDocument()
    expect(screen.getByText("Banned")).toBeInTheDocument()
    expect(screen.queryByText("Custom")).not.toBeInTheDocument()
  })

  it("shows the admin's own labels verbatim under the custom heading", () => {
    renderWithProviders(<CustomerSidebar customer={detail({ customTags: ["wholesale", "vip"] })} />)

    expect(screen.getByText("Custom")).toBeInTheDocument()
    expect(screen.getByText("wholesale")).toBeInTheDocument()
    expect(screen.getByText("vip")).toBeInTheDocument()
    expect(screen.queryByText("System")).not.toBeInTheDocument()
    expect(screen.queryByText("No tags for this customer.")).not.toBeInTheDocument()
  })
})

describe("CustomerSidebar notes", () => {
  it("shows the internal note", () => {
    renderWithProviders(<CustomerSidebar customer={detail({ notes: "Prefers courier delivery" })} />)

    expect(screen.getByText("Prefers courier delivery")).toBeInTheDocument()
  })

  it("says so when there is no internal note", () => {
    renderWithProviders(<CustomerSidebar customer={detail()} />)

    expect(screen.getByText("No internal notes.")).toBeInTheDocument()
  })
})

describe("CustomerSidebar layout", () => {
  it("keeps to the screen on a wide, tall screen and scrolls with the page otherwise", () => {
    const { container } = renderWithProviders(<CustomerSidebar customer={detail()} />)
    const sidebar = container.firstElementChild

    expect(sidebar).toHaveClass(
      "flex",
      "flex-col",
      "2xl:[@media(min-height:57rem)]:min-h-0",
      "2xl:[@media(min-height:57rem)]:overflow-y-auto",
    )
    expect(sidebar).not.toHaveClass("overflow-y-auto")
  })

  it("keeps the profile, tags and notes at their own height so only the timeline gives way", () => {
    renderWithProviders(<CustomerSidebar customer={detail({ notes: "Prefers e-mail." })} />)
    const profile = screen.getByText("Anna Kowalska").closest("[data-slot='card']")

    expect(profile).toHaveClass("shrink-0")
    expect(profile).toContainElement(screen.getByText("No tags for this customer."))
    expect(profile).toContainElement(screen.getByText("Prefers e-mail."))
    expect(profile).not.toContainElement(screen.getByText("Activity Timeline"))
  })

  it("keeps the tag explanation one tap away instead of taking up the sidebar", () => {
    renderWithProviders(<CustomerSidebar customer={detail()} />)

    expect(
      screen.getByRole("button", { name: "System tags are automatic. Add or remove your own labels via Edit customer." }),
    ).toBeInTheDocument()
    expect(screen.queryByText("System tags are automatic. Add or remove your own labels via Edit customer.")).not.toBeInTheDocument()
  })
})

describe("CustomerSidebar activity timeline", () => {
  it("says so when there is no activity", () => {
    renderWithProviders(<CustomerSidebar customer={detail()} />)

    expect(screen.getByText("No activity yet.")).toBeInTheDocument()
  })

  it("describes each event kind in words and shows its date", () => {
    renderWithProviders(
      <CustomerSidebar
        customer={detail({
          timeline: [
            { date: "6 Jan 2026", kind: "page_viewed", path: "/products" },
            { date: "5 Jan 2026", itemCount: 3, kind: "cart_abandoned" },
            { date: "4 Jan 2026", kind: "cart_item_added", productTitle: "Linen shirt", quantity: 2 },
            { date: "3 Jan 2026", kind: "signed_out" },
            { date: "3 Jan 2026", kind: "signed_in" },
            { date: "2 Jan 2026", kind: "order_placed", orderNumber: "MRT-2026-00001", total: "199,00 zl" },
            { date: "1 Jan 2026", kind: "account_created" },
          ],
        })}
      />,
    )

    expect(screen.getByText("Viewed /products")).toBeInTheDocument()
    expect(screen.getByText("Left with 3 items in cart")).toBeInTheDocument()
    expect(screen.getByText("Added Linen shirt to cart (×2)")).toBeInTheDocument()
    expect(screen.getByText("Signed out")).toBeInTheDocument()
    expect(screen.getByText("Signed in")).toBeInTheDocument()
    expect(screen.getByText("Placed order MRT-2026-00001 — 199,00 zl")).toBeInTheDocument()
    expect(screen.getByText("Account created")).toBeInTheDocument()
    expect(screen.getByText("1 Jan 2026")).toBeInTheDocument()
  })

  it("assumes a single unit when a cart event carries no quantity", () => {
    renderWithProviders(
      <CustomerSidebar customer={detail({ timeline: [{ date: "4 Jan 2026", kind: "cart_item_added", productTitle: "Linen shirt" }] })} />,
    )

    expect(screen.getByText("Added Linen shirt to cart (×1)")).toBeInTheDocument()
  })
})
