import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"

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

const MENU_COLLECTIONS = [{ handle: "nowosci", id: "collection-1", image: "collections/arrivals.webp" }]

const menu = vi.hoisted(() => ({ fetchCollections: vi.fn<() => Promise<unknown[]>>() }))

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
vi.mock("~/src/modules/product-collection/use-cases/get-collections", async () => {
  const { COLLECTION_QUERY_KEYS: keys } = await import("~/src/modules/product-collection/product-collection.constants")

  return { getCollectionsQuery: () => ({ queryFn: menu.fetchCollections, queryKey: keys.ALL }) }
})
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

const loadMeta = (locale: LoaderContext["locale"], queryClient = new QueryClient()): Promise<PageMeta> | undefined => {
  menu.fetchCollections.mockResolvedValue(MENU_COLLECTIONS)

  return route.loader?.({ context: { locale, queryClient } })
}

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

describe("account route menu collections", () => {
  it("loads the collections the full-screen menu shows together with the account page", async () => {
    const queryClient = new QueryClient()

    await loadMeta("en-US", queryClient)

    expect(queryClient.getQueryData(COLLECTION_QUERY_KEYS.ALL)).toStrictEqual(MENU_COLLECTIONS)
  })

  it("still opens the account area when the menu collections cannot be loaded, leaving the menu to ask again", async () => {
    const queryClient = new QueryClient()
    menu.fetchCollections.mockRejectedValue(new Error("D1 unavailable"))

    await expect(route.loader?.({ context: { locale: "en-US", queryClient } })).resolves.toMatchObject({ title: "Your Account | M'Arte" })
    expect(queryClient.getQueryState(COLLECTION_QUERY_KEYS.ALL)).toMatchObject({ data: undefined, status: "error" })
  })
})
