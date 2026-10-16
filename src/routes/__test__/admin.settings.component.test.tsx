import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

interface QueryRequest {
  readonly queryKey: readonly unknown[]
}

interface RouteDefinition {
  readonly beforeLoad?: () => void
  readonly component?: () => JSX.Element
  readonly loader?: (args: { context: { queryClient: { query: (request: QueryRequest) => Promise<unknown> } } }) => Promise<void>
  readonly staticData?: unknown
}

const captured = vi.hoisted(() => new Map<string, RouteDefinition>())

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  Outlet: (): JSX.Element => <section data-testid="outlet">settings section</section>,
  createFileRoute: (path: string) => (options: RouteDefinition) => {
    captured.set(path, options)

    return { options }
  },
}))
vi.mock("~/src/modules/customer-account/use-cases/get-customer-profile", () => ({
  getCustomerProfileQuery: () => ({
    queryFn: () => Promise.reject(new Error("the profile is seeded by the test")),
    queryKey: ["customer-account", "profile"],
  }),
}))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-sessions", () => ({
  listCustomerSessionsQuery: () => ({ queryKey: ["customer-account", "sessions"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-login-history", () => ({
  listCustomerLoginHistoryQuery: () => ({ queryKey: ["customer-account", "login-history"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/settings-page-layout", () => ({
  SettingsPageLayout: ({ active, children }: { active: string; children: ReactNode }): JSX.Element => (
    <main data-active={active}>{children}</main>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/account/settings-profile-card", () => ({
  SettingsProfileCard: (): JSX.Element => <section>profile</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/account/settings-preferences-card", () => ({
  SettingsPreferencesCard: (): JSX.Element => <section>preferences</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/security/settings-password-card", () => ({
  SettingsPasswordCard: ({ hasPassword }: { hasPassword: boolean }): JSX.Element => <section>password {String(hasPassword)}</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/security/settings-two-factor-card", () => ({
  SettingsTwoFactorCard: ({ enabled, hasPassword }: { enabled: boolean; hasPassword: boolean }): JSX.Element => (
    <section>
      two-factor {String(enabled)} {String(hasPassword)}
    </section>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/security/settings-sign-in-methods-card", () => ({
  SettingsSignInMethodsCard: ({ hasGoogle, hasPassword }: { hasGoogle: boolean; hasPassword: boolean }): JSX.Element => (
    <section>
      sign-in {String(hasPassword)} {String(hasGoogle)}
    </section>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/security/settings-sessions-card", () => ({
  SettingsSessionsCard: (): JSX.Element => <section>sessions</section>,
}))
vi.mock("~/src/modules/delivery-method/use-cases/list-admin-delivery-methods", () => ({
  listAdminDeliveryMethodsQuery: () => ({ queryKey: ["admin", "delivery-methods"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/delivery/settings-delivery-methods-card", () => ({
  SettingsDeliveryMethodsCard: (): JSX.Element => <section>delivery methods</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/security/settings-login-history-card", () => ({
  SettingsLoginHistoryCard: (): JSX.Element => <section>history</section>,
}))

await import("~/src/routes/admin.settings")
await import("~/src/routes/admin.settings.index")
await import("~/src/routes/admin.settings.account")
await import("~/src/routes/admin.settings.security")
await import("~/src/routes/admin.settings.delivery")

const routeAt = (path: string): RouteDefinition => {
  const route = captured.get(path)
  if (route === undefined) {
    throw new Error(`no route registered at ${path}`)
  }

  return route
}

const render = (path: string, profile?: Partial<CustomerAccount["profile"]>) => {
  const Page = routeAt(path).component
  if (Page === undefined) {
    throw new Error(`the route at ${path} renders no component`)
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(["customer-account", "profile"], profile)

  return renderWithProviders(<Page />, { queryClient })
}

const prefetched = async (path: string): Promise<readonly (readonly unknown[])[]> => {
  const query = vi.fn<(request: QueryRequest) => Promise<unknown>>(() => Promise.resolve())
  await routeAt(path).loader?.({ context: { queryClient: { query } } })

  return query.mock.calls.map(([request]) => request.queryKey)
}

afterEach(cleanup)

describe("admin settings layout route", () => {
  it("renders the chosen settings section and no chrome of its own", () => {
    const { container } = render("/admin/settings")

    expect(container.firstChild).toBe(screen.getByTestId("outlet"))
  })

  it("loads the settings copy and the account and sign-in copy its dialogs reuse", () => {
    expect(routeAt("/admin/settings").staticData).toStrictEqual({
      namespaces: ["pages.admin.settings", "pages.account", "pages.auth.errors", "pages.auth.validations"],
    })
  })
})

describe("admin settings index route", () => {
  it("opens the account section for the bare settings address", () => {
    const route = routeAt("/admin/settings/")
    const caught: { thrown?: unknown } = {}

    try {
      route.beforeLoad?.()
    } catch (error: unknown) {
      caught.thrown = error
    }

    expect(route.component).toBeUndefined()
    expect(caught.thrown).toMatchObject({ options: { to: "/admin/settings/account" } })
  })
})

describe("admin settings account route", () => {
  it("loads the profile before the page renders", async () => {
    await expect(prefetched("/admin/settings/account")).resolves.toStrictEqual([["customer-account", "profile"]])
  })

  it("shows the profile and then the preferences under the account tab", () => {
    render("/admin/settings/account")

    const main = screen.getByRole("main")

    expect(main).toHaveAttribute("data-active", "account")
    expect([...main.children].map((section) => section.textContent)).toStrictEqual(["profile", "preferences"])
  })
})

describe("admin settings security route", () => {
  it("loads the profile, the signed-in devices and the sign-in history before the page renders", async () => {
    await expect(prefetched("/admin/settings/security")).resolves.toStrictEqual([
      ["customer-account", "profile"],
      ["customer-account", "sessions"],
      ["customer-account", "login-history"],
    ])
  })

  it("passes the account's password, two-factor and Google state to its cards in order", () => {
    render("/admin/settings/security", { hasGoogle: true, hasPassword: false, twoFactorEnabled: true })

    const main = screen.getByRole("main")

    expect(main).toHaveAttribute("data-active", "security")
    expect([...main.children].map((section) => section.textContent)).toStrictEqual([
      "password false",
      "two-factor true false",
      "sign-in false true",
      "sessions",
      "history",
    ])
  })
})

describe("admin settings delivery route", () => {
  it("loads every delivery method and carrier before the page renders", async () => {
    await expect(prefetched("/admin/settings/delivery")).resolves.toStrictEqual([["admin", "delivery-methods"]])
  })

  it("shows the delivery methods under the delivery tab", () => {
    render("/admin/settings/delivery")

    const main = screen.getByRole("main")

    expect(main).toHaveAttribute("data-active", "delivery")
    expect([...main.children].map((section) => section.textContent)).toStrictEqual(["delivery methods"])
  })
})
