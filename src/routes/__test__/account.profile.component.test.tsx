import { type JSX, Suspense } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

interface PrefetchedQuery {
  readonly queryKey: readonly unknown[]
  readonly staleTime: unknown
}

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (args: {
    readonly context: {
      readonly locale: string
      readonly queryClient: { readonly query: (options: PrefetchedQuery) => Promise<unknown> }
    }
  }) => Promise<unknown>
  readonly staleTime?: number
}

const captured = vi.hoisted((): { current: RouteDefinition | undefined } => ({ current: undefined }))

const state = vi.hoisted((): { profile: unknown } => ({ profile: undefined }))

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
  getCustomerProfileQuery: () => ({ queryFn: () => Promise.resolve(state.profile), queryKey: ["customer-account", "profile"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/personal-info-section", () => ({
  PersonalInfoSection: ({ profile }: Readonly<{ profile: CustomerAccount["profile"] | undefined }>): JSX.Element => (
    <section>personal info for {profile?.email ?? "nobody"}</section>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/preferences-section", () => ({
  PreferencesSection: (): JSX.Element => <section>preferences</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/security-section", () => ({
  SecuritySection: (): JSX.Element => <section>security</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/close-account-section", () => ({
  CloseAccountSection: (): JSX.Element => <section>close account</section>,
}))

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"

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
}

const renderPage = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading profile</p>}>
      <ProfilePage />
    </Suspense>,
  )

const runLoader = async (): Promise<PrefetchedQuery[]> => {
  const queried: PrefetchedQuery[] = []
  await route.loader?.({
    context: {
      locale: "en-US",
      queryClient: {
        query: (options: PrefetchedQuery) => {
          queried.push(options)

          return Promise.resolve(
            options.queryKey[0] === "messages" ? { description: "", sidebar: { profile: "Profile" }, title: "" } : profile,
          )
        },
      },
    },
  })

  return queried
}

beforeEach(() => {
  state.profile = profile
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

    expect(screen.getByText("security")).toBeInTheDocument()
    expect(screen.getByText("close account")).toBeInTheDocument()
  })
})

describe("account profile route wiring", () => {
  it("prefetches the profile as already fresh", async () => {
    const queried = await runLoader()

    const pageQueries = queried.filter((options) => options.queryKey[0] !== "messages")

    expect(pageQueries.map((options) => options.queryKey)).toStrictEqual([["customer-account", "profile"]])
    expect(pageQueries.map((options) => options.staleTime)).toStrictEqual(["static"])
  })

  it("keeps the prefetched profile for as long as the account queries stay fresh", () => {
    expect(route.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })
})
