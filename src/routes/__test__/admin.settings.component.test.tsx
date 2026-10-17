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
vi.mock("~/src/presentation/components/custom/pages/admin/settings/account/settings-account-deletion-card", () => ({
  SettingsAccountDeletionCard: (): JSX.Element => <section>deletion</section>,
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
vi.mock("~/src/modules/store-setting/use-cases/get-free-delivery", () => ({
  getAdminFreeDeliveryQuery: () => ({ queryKey: ["admin", "store-setting", "free-delivery"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/delivery/settings-delivery-page", () => ({
  SettingsDeliveryPage: (): JSX.Element => <main data-active="delivery">delivery page</main>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/security/settings-login-history-card", () => ({
  SettingsLoginHistoryCard: (): JSX.Element => <section>history</section>,
}))
vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", () => ({
  getAdminSellerDetailsQuery: () => ({ queryKey: ["admin", "store-setting", "seller-details"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/store/settings-seller-details-card", () => ({
  SettingsSellerDetailsCard: (): JSX.Element => <section>seller details</section>,
}))
vi.mock("~/src/modules/user/use-cases/list-admin-team", () => ({
  listAdminTeamQuery: () => ({ queryKey: ["admin", "users", "team"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/team/components/team-table", () => ({
  TeamTable: (): JSX.Element => <section>team</section>,
}))

await import("~/src/routes/admin.settings")
await import("~/src/routes/admin.settings.index")
await import("~/src/routes/admin.settings.account")
await import("~/src/routes/admin.settings.security")
await import("~/src/routes/admin.settings.delivery")
await import("~/src/routes/admin.settings.store")
await import("~/src/routes/admin.settings.team")

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

  it("shows the profile, the preferences and how to delete the account under the account tab", () => {
    render("/admin/settings/account")

    const main = screen.getByRole("main")

    expect(main).toHaveAttribute("data-active", "account")
    expect([...main.children].map((section) => section.textContent)).toStrictEqual(["profile", "preferences", "deletion"])
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
  it("loads every delivery method, carrier and the free delivery threshold before the page renders", async () => {
    await expect(prefetched("/admin/settings/delivery")).resolves.toStrictEqual([
      ["admin", "delivery-methods"],
      ["admin", "store-setting", "free-delivery"],
    ])
  })

  it("shows the delivery page under the delivery tab", () => {
    render("/admin/settings/delivery")

    expect(screen.getByRole("main")).toHaveTextContent("delivery page")
  })
})

describe("admin settings store route", () => {
  it("loads the seller details before the page renders", async () => {
    await expect(prefetched("/admin/settings/store")).resolves.toStrictEqual([["admin", "store-setting", "seller-details"]])
  })

  it("shows the seller details under the store tab", () => {
    render("/admin/settings/store")

    const main = screen.getByRole("main")

    expect(main).toHaveAttribute("data-active", "store")
    expect([...main.children].map((section) => section.textContent)).toStrictEqual(["seller details"])
  })
})

describe("admin settings team route", () => {
  it("loads the admins before the page renders", async () => {
    await expect(prefetched("/admin/settings/team")).resolves.toStrictEqual([["admin", "users", "team"]])
  })

  it("shows the admins grid under the team tab", () => {
    render("/admin/settings/team")

    const main = screen.getByRole("main")

    expect(main).toHaveAttribute("data-active", "team")
    expect([...main.children].map((section) => section.textContent)).toStrictEqual(["team"])
  })
})
