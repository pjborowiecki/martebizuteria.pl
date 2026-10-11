import { Suspense } from "react"

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const auth = vi.hoisted(() => ({
  enableTwoFactor: vi.fn<(input: { password: string }) => Promise<{ data: unknown; error: unknown }>>(),
  signOut: vi.fn<(input: { fetchOptions: { onSuccess: () => void } }) => Promise<void>>(),
  verifyTotp: vi.fn<(input: { code: string }) => Promise<{ error: unknown }>>(),
}))

const profile = vi.hoisted(() => ({ fetchProfile: vi.fn<() => Promise<CustomerAccount["profile"]>>() }))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({
  authClient: { twoFactor: { enable: auth.enableTwoFactor, verifyTotp: auth.verifyTotp } },
  signOut: auth.signOut,
}))
vi.mock("qrcode", () => ({ default: { toString: () => Promise.resolve("<svg></svg>") } }))
vi.mock("~/src/modules/customer-account/use-cases/get-customer-profile", async () => {
  const { CUSTOMER_ACCOUNT_QUERY_KEYS } = await import("~/src/modules/customer-account/customer-account.constants")

  return { getCustomerProfileQuery: () => ({ queryFn: profile.fetchProfile, queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE }) }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { AdminSecurityPage } from "~/src/presentation/components/custom/pages/admin/security/admin-security-page"

import polishAccountMessages from "~/messages/pl-PL/pages.account.json"
import polishAdminMessages from "~/messages/pl-PL/pages.admin.json"
import { ROUTES } from "~/src/routes"

const TOTP_URI = "otpauth://totp/M'ARTE:owner@marte.test?secret=JBSWY3DPEHPK3PXP&issuer=M'ARTE"

const adminProfile = (overrides: Partial<CustomerAccount["profile"]>): CustomerAccount["profile"] => ({
  createdAt: new Date("2026-01-10T00:00:00.000Z"),
  email: "owner@marte.test",
  emailVerified: true,
  hasPassword: true,
  name: "Owner",
  twoFactorEnabled: false,
  ...overrides,
})

const renderPage = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <AdminSecurityPage />
    </Suspense>,
  )

const submit = async (name: string): Promise<void> => {
  const button = await screen.findByRole("button", { name })
  await waitFor(() => {
    expect(button).toBeEnabled()
  })
  fireEvent.click(button)
}

beforeEach(() => {
  vi.clearAllMocks()
  document.documentElement.classList.add("dark")
  profile.fetchProfile.mockResolvedValue(adminProfile({}))
  auth.signOut.mockResolvedValue()
  auth.enableTwoFactor.mockResolvedValue({ data: { backupCodes: ["AAAA-1111"], method: "totp", totpURI: TOTP_URI }, error: null })
  auth.verifyTotp.mockResolvedValue({ error: null })
})

afterEach(cleanup)

describe("admin security page", () => {
  it("tells an admin without two-factor authentication that the admin panel waits for it", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 1, name: "Sign-in security" })).toBeInTheDocument()
    expect(screen.getByText("Admin panel")).toBeInTheDocument()
    expect(screen.getByText(/^The admin panel opens only once two-factor authentication is on\./u)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Go to the admin panel" })).toBeNull()
  })

  it("offers the admin panel to an admin with two-factor authentication, who can also turn it off", async () => {
    profile.fetchProfile.mockResolvedValue(adminProfile({ twoFactorEnabled: true }))
    renderPage()

    expect(await screen.findByRole("link", { name: "Go to the admin panel" })).toHaveAttribute("href", ROUTES.ADMIN_OVERVIEW)
    expect(screen.getByText(/^Two-factor authentication is on\./u)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument()
  })

  it("tells an admin without a password how to set one before turning two-factor authentication on", async () => {
    profile.fetchProfile.mockResolvedValue(adminProfile({ hasPassword: false }))
    renderPage()

    expect(await screen.findByText(/^This account has no password yet/u)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Enable" })).toBeNull()
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument()
  })

  it("takes the admin through the account's two-factor setup and then offers the admin panel", async () => {
    profile.fetchProfile.mockResolvedValueOnce(adminProfile({})).mockResolvedValue(adminProfile({ twoFactorEnabled: true }))
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "Enable" }))
    fireEvent.change(await screen.findByLabelText("Password"), { target: { value: "OwnerPassword1!" } })
    await submit("Continue")
    fireEvent.change(await screen.findByLabelText("Six-digit code"), { target: { value: "123456" } })
    await submit("Verify and enable")

    expect(await screen.findByRole("heading", { name: "Save your recovery codes" })).toBeInTheDocument()
    expect(auth.enableTwoFactor).toHaveBeenCalledWith({ password: "OwnerPassword1!" })
    expect(auth.verifyTotp).toHaveBeenCalledWith({ code: "123456" })
    fireEvent.click(screen.getByRole("button", { name: "I have saved these codes" }))
    expect(await screen.findByRole("link", { name: "Go to the admin panel" })).toBeInTheDocument()
  })

  it("signs the admin out and resolves the sign-in page for the browser redirect", async () => {
    const { router } = renderPage()
    const buildLocation = vi.spyOn(router, "buildLocation")

    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }))

    expect(auth.signOut).toHaveBeenCalledOnce()
    auth.signOut.mock.calls[0]?.[0].fetchOptions.onSuccess()
    expect(buildLocation).toHaveBeenCalledWith({ to: ROUTES.AUTH_SIGN_IN })
  })

  it("drops the storefront dark theme like the rest of the admin", async () => {
    renderPage()
    await screen.findByRole("heading", { level: 1 })

    expect(document.documentElement).not.toHaveClass("dark")
  })
})

describe("admin security page in Polish", () => {
  it("heads the page and explains the requirement in Polish", async () => {
    renderWithProviders(
      <IntlProvider
        locale="pl-PL"
        messages={{ pages: { account: polishAccountMessages, admin: polishAdminMessages } }}
        timeZone={I18N.DEFAULT_TIMEZONE}
      >
        <Suspense fallback={<p>loading</p>}>
          <AdminSecurityPage />
        </Suspense>
      </IntlProvider>,
    )

    expect(await screen.findByRole("heading", { level: 1, name: "Bezpieczeństwo logowania" })).toBeInTheDocument()
    expect(screen.getByText(/^Panel administracyjny otworzy się dopiero po włączeniu/u)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Wyloguj się" })).toBeInTheDocument()
  })
})
