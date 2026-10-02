import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { type PageMeta } from "~/src/lib/seo"

interface LoaderContext {
  readonly locale: "en-US" | "pl-PL"
  readonly queryClient: QueryClient
}

interface RouteDefinition {
  readonly beforeLoad?: unknown
  readonly loader?: (args: { context: LoaderContext }) => Promise<PageMeta>
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

const guard = vi.hoisted(() => ({ requireCustomer: vi.fn() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => guard)
vi.mock("~/src/presentation/components/custom/pages/account/account-error-state", () => ({
  AccountErrorState: () => null,
  AccountNotFoundState: () => null,
}))
vi.mock("~/src/presentation/components/custom/pages/account/account-sidebar", () => ({ AccountSidebar: () => null }))
vi.mock("~/src/presentation/components/custom/pages/landing-page/footer/footer", () => ({ Footer: () => null }))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: () => null,
}))

await import("~/src/routes/account")

const route = captured.current

if (route === undefined) {
  throw new Error("the account route did not register any options")
}

const loadMeta = (locale: LoaderContext["locale"]): Promise<PageMeta> | undefined =>
  route.loader?.({ context: { locale, queryClient: new QueryClient() } })

describe("account route guard", () => {
  it("lets only a signed-in customer into the account area", () => {
    expect(route.beforeLoad).toBe(guard.requireCustomer)
  })
})

describe("account route metadata", () => {
  it("titles the account area from the English catalogue", async () => {
    await expect(loadMeta("en-US")).resolves.toStrictEqual({
      description: "Your orders, addresses, saved pieces and account settings.",
      title: "Your Account | M'Arte",
    })
  })

  it("titles the account area from the Polish catalogue", async () => {
    await expect(loadMeta("pl-PL")).resolves.toMatchObject({ title: "Twoje konto | M'Arte" })
  })
})
