import { type JSX, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import polishAccountMessages from "~/messages/pl-PL/pages.account.json"

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (args: { readonly context: { readonly locale: string; readonly queryClient: QueryClient } }) => Promise<unknown>
  readonly staleTime?: number
}

const captured = vi.hoisted((): { current: RouteDefinition | undefined } => ({ current: undefined }))

const state = vi.hoisted(() => ({
  fetchNewsletterSubscription: vi.fn<() => Promise<{ readonly status: string | undefined }>>(),
  fetchProfile: vi.fn<() => Promise<unknown>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})

vi.mock("~/src/modules/customer-account/use-cases/get-customer-profile", () => ({
  getCustomerProfileQuery: () => ({ queryFn: state.fetchProfile, queryKey: ["customer-account", "profile"] }),
}))
vi.mock("~/src/modules/newsletter/use-cases/get-own-newsletter-subscription", async () => {
  const { NEWSLETTER_QUERY_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return {
    getOwnNewsletterSubscriptionQuery: () => ({
      queryFn: state.fetchNewsletterSubscription,
      queryKey: NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION,
    }),
  }
})
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/personal-info-section", () => ({
  PersonalInfoSection: ({ profile }: Readonly<{ profile: CustomerAccount["profile"] | undefined }>): JSX.Element => (
    <section>personal info for {profile?.email ?? "nobody"}</section>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/preferences-section", () => ({
  PreferencesSection: (): JSX.Element => <section>preferences</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/security-section", () => ({
  SecuritySection: ({ twoFactorEnabled }: Readonly<{ twoFactorEnabled: boolean }>): JSX.Element => (
    <section>security with two-factor {twoFactorEnabled ? "on" : "off"}</section>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/close-account-section", () => ({
  CloseAccountSection: (): JSX.Element => <section>close account</section>,
}))

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { NEWSLETTER_QUERY_KEYS, NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"

await import("~/src/routes/account.profile")

const route = captured.current

if (route === undefined) {
  throw new Error("the account profile route did not register any options")
}

const ProfilePage = (): JSX.Element => {
  const Page = route.component
  if (Page === undefined) {
    throw new Error("the account profile route renders no component")
  }

  return <Page />
}

const profile: CustomerAccount["profile"] = {
  createdAt: new Date("2024-01-10T00:00:00.000Z"),
  email: "anna@example.com",
  emailVerified: true,
  hasPassword: true,
  name: "Anna Kowalska",
  phone: "+48600123456",
  twoFactorEnabled: true,
}

const renderPage = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading profile</p>}>
      <ProfilePage />
    </Suspense>,
  )

const runLoader = async () => {
  const queryClient = new QueryClient()
  const query = vi.spyOn(queryClient, "query")
  const meta = await route.loader?.({ context: { locale: "en-US", queryClient } })
  const pageQueries = query.mock.calls.map(([options]) => options).filter((options) => options.queryKey[0] !== "messages")

  return { meta, pageQueries, queryClient }
}

beforeEach(() => {
  state.fetchProfile.mockReset().mockResolvedValue(profile)
  state.fetchNewsletterSubscription.mockReset().mockResolvedValue({ status: NEWSLETTER_STATUS.CONFIRMED })
})

afterEach(cleanup)

describe("account profile page", () => {
  it("heads the page with the account settings eyebrow and title", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 1, name: "Your Profile" })).toBeInTheDocument()
    expect(screen.getByText("Account Settings")).toBeInTheDocument()
  })

  it("hands the loaded profile to the personal information section", async () => {
    renderPage()

    expect(await screen.findByText("personal info for anna@example.com")).toBeInTheDocument()
  })

  it("stacks the preferences, security and account closing sections below", async () => {
    renderPage()
    await screen.findByText("preferences")

    expect(screen.getByText(/^security/u)).toBeInTheDocument()
    expect(screen.getByText("close account")).toBeInTheDocument()
  })
})

describe("account profile page in Polish", () => {
  it("heads the page in Polish sentence case", async () => {
    renderWithProviders(
      <IntlProvider locale="pl-PL" messages={{ pages: { account: polishAccountMessages } }} timeZone={I18N.DEFAULT_TIMEZONE}>
        <Suspense fallback={<p>loading profile</p>}>
          <ProfilePage />
        </Suspense>
      </IntlProvider>,
    )

    expect(await screen.findByRole("heading", { level: 1, name: "Twój profil" })).toBeInTheDocument()
    expect(screen.getByText("Ustawienia konta")).toBeInTheDocument()
  })
})

describe("account profile two-factor status", () => {
  it("tells the security section the account has two-factor on", async () => {
    renderPage()

    expect(await screen.findByText("security with two-factor on")).toBeInTheDocument()
  })

  it("tells the security section the account has two-factor off", async () => {
    state.fetchProfile.mockResolvedValue({ ...profile, twoFactorEnabled: false })
    renderPage()

    expect(await screen.findByText("security with two-factor off")).toBeInTheDocument()
  })
})

describe("account profile route wiring", () => {
  it("prefetches the profile and the newsletter status as already fresh", async () => {
    const { pageQueries } = await runLoader()

    expect(pageQueries.map((options) => options.queryKey)).toStrictEqual([
      ["customer-account", "profile"],
      ["newsletter", "ownSubscription"],
    ])
    expect(pageQueries.map((options) => options.staleTime)).toStrictEqual(["static", "static"])
  })

  it("leaves the newsletter status in the cache for the preferences section", async () => {
    const { queryClient } = await runLoader()

    expect(queryClient.getQueryData(NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION)).toStrictEqual({ status: NEWSLETTER_STATUS.CONFIRMED })
  })

  it("asks for the newsletter status without waiting for the profile", async () => {
    const profileResponse = Promise.withResolvers<unknown>()
    state.fetchProfile.mockReturnValue(profileResponse.promise)
    const loaded = runLoader()

    await vi.waitFor(() => {
      expect(state.fetchNewsletterSubscription).toHaveBeenCalledOnce()
    })
    expect(state.fetchProfile).toHaveBeenCalledOnce()
    profileResponse.resolve(profile)

    await expect(loaded).resolves.toMatchObject({ meta: { title: "Profile | M'Arte" } })
  })

  it("still opens the profile when the newsletter status cannot be loaded, leaving the field to ask again", async () => {
    state.fetchNewsletterSubscription.mockRejectedValue(new Error("D1 unavailable"))

    const { meta, queryClient } = await runLoader()

    expect(meta).toMatchObject({ title: "Profile | M'Arte" })
    expect(queryClient.getQueryState(NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION)).toMatchObject({ data: undefined, status: "error" })
  })

  it("fails the page when the profile itself cannot be loaded", async () => {
    state.fetchProfile.mockRejectedValue(new Error("D1 unavailable"))

    await expect(runLoader()).rejects.toThrow("D1 unavailable")
  })

  it("keeps the prefetched profile for as long as the account queries stay fresh", () => {
    expect(route.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })
})
