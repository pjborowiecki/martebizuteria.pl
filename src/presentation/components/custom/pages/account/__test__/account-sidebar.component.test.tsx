import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import polishAccountMessages from "~/messages/pl-PL/pages.account.json"

const { signOut, toastError } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<{ error?: { message?: string } }>>(),
  toastError: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signOut }))

import { AccountSidebar } from "~/src/presentation/components/custom/pages/account/account-sidebar"

beforeEach(() => {
  vi.clearAllMocks()
  signOut.mockResolvedValue({})
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
      "Payment Methods",
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

  it("renders the links inside a navigation landmark a screen reader can name", () => {
    renderWithProviders(<AccountSidebar />)

    expect(screen.getByRole("navigation", { name: "Your Account" })).toContainElement(screen.getByRole("link", { name: "Orders" }))
  })

  it("keeps the navigation and the sign out reachable on a phone", () => {
    renderWithProviders(<AccountSidebar />)

    const aside = screen.getByRole("navigation").closest("aside")

    expect(aside?.className).not.toContain("hidden")
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeVisible()
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

  it("says so when signing out failed, and lets the customer try again", async () => {
    signOut.mockResolvedValue({ error: { message: "offline" } })
    renderWithProviders(<AccountSidebar />)

    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("We could not sign you out. Please try again.")
    })
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeEnabled()
  })

  it("still reports a failed sign out when the auth server gives no reason", async () => {
    signOut.mockResolvedValue({ error: {} })
    renderWithProviders(<AccountSidebar />)

    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("We could not sign you out. Please try again.")
    })
  })

  it("stops a second sign out while the first is still running", async () => {
    const inFlight = Promise.withResolvers<{ error?: { message?: string } }>()
    signOut.mockReturnValue(inFlight.promise)
    renderWithProviders(<AccountSidebar />)

    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }))

    expect(screen.getByRole("button", { name: "Sign Out" })).toBeDisabled()

    inFlight.resolve({})
    await waitFor(() => {
      expect(signOut).toHaveBeenCalledOnce()
    })
  })

  it("sends the signed out customer to the storefront home page", async () => {
    const location = { href: "/account/overview" }
    vi.stubGlobal("location", location)
    renderWithProviders(<AccountSidebar />)

    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }))

    await waitFor(() => {
      expect(location.href).toBe("/")
    })
    vi.unstubAllGlobals()
  })
})

const renderPolishSidebar = () =>
  renderWithProviders(
    <IntlProvider locale="pl-PL" messages={{ pages: { account: polishAccountMessages } }} timeZone={I18N.DEFAULT_TIMEZONE}>
      <AccountSidebar />
    </IntlProvider>,
  )

describe("AccountSidebar in Polish", () => {
  it("calls the account landing page Podsumowanie", () => {
    renderPolishSidebar()

    expect(screen.getByRole("link", { name: "Podsumowanie" })).toHaveAttribute("href", "/account/overview")
  })

  it("heads the sidebar and names its navigation in Polish sentence case", () => {
    renderPolishSidebar()

    expect(screen.getByRole("heading", { level: 2, name: "Moje konto" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Moje konto" })).toBeInTheDocument()
  })
})
