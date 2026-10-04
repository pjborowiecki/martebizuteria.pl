import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

type AuthLayoutLoader = (args: { readonly context: { readonly queryClient: QueryClient } }) => Promise<unknown>

const guarded = vi.hoisted(() => ({
  beforeLoad: undefined as unknown,
  loader: undefined as AuthLayoutLoader | undefined,
  redirectIfSignedIn: vi.fn<() => Promise<void>>(),
}))

const menu = vi.hoisted(() => ({ fetchCollections: vi.fn<() => Promise<unknown[]>>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: { beforeLoad: unknown; loader: AuthLayoutLoader }) => {
      guarded.beforeLoad = options.beforeLoad
      guarded.loader = options.loader

      return { options }
    },
    Outlet: (): JSX.Element => <form data-testid="outlet" />,
  }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => ({ redirectIfSignedIn: guarded.redirectIfSignedIn }))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", async () => {
  const { COLLECTION_QUERY_KEYS } = await import("~/src/modules/product-collection/product-collection.constants")

  return { getCollectionsQuery: () => ({ queryFn: menu.fetchCollections, queryKey: COLLECTION_QUERY_KEYS.ALL }) }
})
vi.mock("~/src/presentation/components/custom/pages/auth/auth-editorial", () => ({
  AuthEditorial: (): JSX.Element => <aside data-testid="auth-editorial" />,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: (): JSX.Element => <nav data-testid="navigation" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"

import { Route } from "~/src/routes/auth"

const renderAuthLayout = () => {
  const AuthLayoutRoute = Route.options.component
  if (AuthLayoutRoute === undefined) {
    throw new Error("the auth layout route registered no component")
  }

  return renderWithProviders(<AuthLayoutRoute />)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("auth layout route", () => {
  it("keeps the storefront navigation above the auth split", () => {
    renderAuthLayout()

    expect(screen.getByTestId("navigation")).toBeInTheDocument()
  })

  it("shows the editorial panel beside the form", () => {
    renderAuthLayout()

    expect(screen.getByTestId("auth-editorial")).toBeInTheDocument()
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
  })

  it("puts the editorial panel before the form in the document", () => {
    renderAuthLayout()

    const editorial = screen.getByTestId("auth-editorial")
    const outlet = screen.getByTestId("outlet")

    expect(editorial.compareDocumentPosition(outlet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("sends a visitor who is already signed in on before the auth pages load", () => {
    expect(guarded.beforeLoad).toBe(guarded.redirectIfSignedIn)
  })

  it("declares the auth message namespaces the nested pages need", () => {
    expect(Route.options.staticData?.namespaces).toStrictEqual(["pages.auth.errors", "pages.auth.validations", "pages.auth.oauth"])
  })
})

describe("auth layout loader", () => {
  it("loads the collections the full-screen menu shows together with the auth page", async () => {
    const collections = [{ handle: "nowosci", id: "collection-1", image: "collections/arrivals.webp" }]
    menu.fetchCollections.mockResolvedValue(collections)
    const queryClient = new QueryClient()

    await guarded.loader?.({ context: { queryClient } })

    expect(menu.fetchCollections).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(COLLECTION_QUERY_KEYS.ALL)).toStrictEqual(collections)
  })

  it("still opens the auth page when the menu collections cannot be loaded, leaving the menu to ask again", async () => {
    menu.fetchCollections.mockRejectedValueOnce(new Error("D1 unavailable"))
    const queryClient = new QueryClient()

    await expect(guarded.loader?.({ context: { queryClient } })).resolves.toBeUndefined()
    expect(queryClient.getQueryState(COLLECTION_QUERY_KEYS.ALL)).toMatchObject({ data: undefined, status: "error" })
  })
})
