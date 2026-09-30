import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

const { signOut } = vi.hoisted(() => ({
  signOut: vi.fn<(input: { fetchOptions: { onSuccess: () => void } }) => Promise<void>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signOut }))

import { AccountSidebar } from "~/src/presentation/components/custom/pages/account/account-sidebar"

beforeEach(() => {
  vi.clearAllMocks()
  signOut.mockResolvedValue()
})

afterEach(() => {
  cleanup()
})

describe("AccountSidebar", () => {
  it("heads the sidebar with the account title", () => {
    renderWithProviders(<AccountSidebar />)

    expect(screen.getByRole("heading", { level: 2, name: "Your Account" })).toBeInTheDocument()
  })

  it("links to every account page in order", () => {
    renderWithProviders(<AccountSidebar />)
    const links = screen.getAllByRole("link")

    expect(links.map((link) => link.textContent)).toStrictEqual([
      "Overview",
      "Profile",
      "Orders",
      "Addresses",
      "Payment",
      "Wishlist",
      "Sessions",
    ])
    expect(links.map((link) => link.getAttribute("href"))).toStrictEqual([
      "/account/overview",
      "/account/profile",
      "/account/orders",
      "/account/addresses",
      "/account/payment",
      "/account/wishlist",
      "/account/sessions",
    ])
  })

  it("renders the links inside a navigation landmark", () => {
    renderWithProviders(<AccountSidebar />)

    expect(screen.getByRole("navigation")).toContainElement(screen.getByRole("link", { name: "Orders" }))
  })

  it("styles a link the shopper is not on as inactive", () => {
    renderWithProviders(<AccountSidebar />, { router: createTestRouter("/account/orders") })

    expect(screen.getByRole("link", { name: "Overview" }).className).toContain("text-muted-foreground")
    expect(screen.getByRole("link", { name: "Overview" }).className).not.toContain("font-medium")
  })

  it("offers a sign out action outside the navigation", () => {
    renderWithProviders(<AccountSidebar />)

    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument()
    expect(screen.getByRole("navigation")).not.toContainElement(screen.getByRole("button", { name: "Sign Out" }))
  })

  it("signs the customer out when the action is pressed", async () => {
    renderWithProviders(<AccountSidebar />)

    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }))

    expect(signOut).toHaveBeenCalledOnce()
  })

  it("sends the signed out customer to the storefront home page", async () => {
    const location = { href: "/account/overview" }
    vi.stubGlobal("location", location)
    renderWithProviders(<AccountSidebar />)

    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }))
    signOut.mock.calls[0]?.[0].fetchOptions.onSuccess()

    expect(location.href).toBe("/")
    vi.unstubAllGlobals()
  })
})
