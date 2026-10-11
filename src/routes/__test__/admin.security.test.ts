import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

interface RouteDefinition {
  readonly beforeLoad?: unknown
  readonly component?: unknown
  readonly loader?: (args: { readonly context: { readonly queryClient: QueryClient } }) => Promise<unknown>
  readonly staticData?: { readonly namespaces: readonly string[] }
}

const captured: { current: RouteDefinition | undefined; path: string | undefined } = { current: undefined, path: undefined }

const guard = vi.hoisted(() => ({ requireAdminRole: vi.fn() }))

const page = vi.hoisted(() => ({ AdminSecurityPage: vi.fn(() => null) }))

const profile = vi.hoisted(() => ({ fetchProfile: vi.fn<() => Promise<unknown>>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: (path: string) => (options: RouteDefinition) => {
      captured.current = options
      captured.path = path

      return options
    },
  }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => guard)
vi.mock("~/src/modules/customer-account/use-cases/get-customer-profile", () => ({
  getCustomerProfileQuery: () => ({ queryFn: profile.fetchProfile, queryKey: ["customer-account", "profile"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/security/admin-security-page", () => page)

await import("~/src/routes/admin_.security")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin security route did not register any options")
}

describe("admin security route", () => {
  it("sits outside the admin layout, so its two-factor guard cannot send the admin away from it", () => {
    expect(captured.path).toBe("/admin_/security")
  })

  it("admits any admin, with or without two-factor authentication", () => {
    expect(route.beforeLoad).toBe(guard.requireAdminRole)
  })

  it("renders the admin security page", () => {
    expect(route.component).toBe(page.AdminSecurityPage)
  })

  it("prefetches the admin's own profile as already fresh", async () => {
    const queryClient = new QueryClient()
    const query = vi.spyOn(queryClient, "query")
    profile.fetchProfile.mockResolvedValue({ hasPassword: true, twoFactorEnabled: false })

    await route.loader?.({ context: { queryClient } })

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["customer-account", "profile"], staleTime: "static" }))
    expect(queryClient.getQueryData(["customer-account", "profile"])).toStrictEqual({ hasPassword: true, twoFactorEnabled: false })
  })

  it("loads the messages of the account's two-factor dialogs it reuses", () => {
    expect(route.staticData?.namespaces).toStrictEqual(["pages.admin", "pages.account", "pages.auth.errors", "pages.auth.validations"])
  })
})
