import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { type PageMeta } from "~/src/lib/seo"

interface LoaderContext {
  readonly locale: "en-US" | "pl-PL"
  readonly queryClient: QueryClient
}

interface RouteDefinition {
  readonly beforeLoad?: () => Promise<{ user: unknown }>
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
vi.mock("~/src/presentation/components/custom/pages/account/account-sidebar", () => ({ AccountSidebar: () => null }))
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
  it("hands the signed-in customer to every child route", async () => {
    guard.requireCustomer.mockResolvedValue({ email: "ada@example.test", id: "user-7" })

    await expect(route.beforeLoad?.()).resolves.toStrictEqual({ user: { email: "ada@example.test", id: "user-7" } })
  })

  it("lets the guard reject a visitor who is not signed in", async () => {
    guard.requireCustomer.mockRejectedValue(new Error("Unauthorized"))

    await expect(route.beforeLoad?.()).rejects.toThrow("Unauthorized")
  })
})

describe("account route metadata", () => {
  it("titles the account area from the English catalogue", async () => {
    await expect(loadMeta("en-US")).resolves.toStrictEqual({
      description: "Sign in and order history will appear here.",
      title: "Account",
    })
  })

  it("titles the account area from the Polish catalogue", async () => {
    await expect(loadMeta("pl-PL")).resolves.toMatchObject({ title: "Konto" })
  })
})
