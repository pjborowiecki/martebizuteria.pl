import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const realtime = vi.hoisted(() => ({
  sync: vi.fn<(options: { readonly hub: string; readonly subscriptions: readonly unknown[] }) => void>(),
}))

interface StorefrontRouteOptions {
  readonly head: () => { links: { href: string; rel: string }[] }
  readonly loader: (args: { readonly context: { readonly queryClient: QueryClient } }) => Promise<unknown>
}

const metadata = vi.hoisted(() => ({
  head: undefined as StorefrontRouteOptions["head"] | undefined,
  loader: undefined as StorefrontRouteOptions["loader"] | undefined,
}))

const menu = vi.hoisted(() => ({ fetchCollections: vi.fn<() => Promise<unknown[]>>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return {
    ...actual,
    createFileRoute: () => (options: StorefrontRouteOptions) => {
      metadata.head = options.head
      metadata.loader = options.loader

      return { options }
    },
    Outlet: (): JSX.Element => <div data-testid="storefront-outlet" />,
  }
})

vi.mock("~/src/modules/product-collection/use-cases/get-collections", async () => {
  const { COLLECTION_QUERY_KEYS } = await import("~/src/modules/product-collection/product-collection.constants")

  return { getCollectionsQuery: () => ({ queryFn: menu.fetchCollections, queryKey: COLLECTION_QUERY_KEYS.ALL }) }
})

vi.mock("~/src/hooks/use-realtime-query-sync", () => ({
  useRealtimeQuerySync: (options: { readonly hub: string; readonly subscriptions: readonly unknown[] }) => {
    realtime.sync(options)
  },
}))

vi.mock("~/src/presentation/components/custom/customer-activity-tracker", () => ({
  CustomerActivityTracker: (): JSX.Element => <div data-testid="activity-tracker" />,
}))

vi.mock("~/src/presentation/components/custom/cart-availability-banner", () => ({
  CartAvailabilityBanner: (): JSX.Element => <div data-testid="availability-banner" />,
}))

vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: (): JSX.Element => <nav data-testid="storefront-navigation" />,
}))

vi.mock("~/src/presentation/components/custom/pages/landing-page/footer/footer", () => ({
  Footer: (): JSX.Element => <footer data-testid="storefront-footer" />,
}))

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"

import { Route } from "~/src/routes/_storefront"

import storefrontCss from "~/src/presentation/styles/storefront.css?url"

const renderLayout = () => {
  const StorefrontLayout = Route.options.component
  if (StorefrontLayout === undefined) {
    throw new Error("the storefront layout registered no component")
  }

  return renderWithProviders(<StorefrontLayout />)
}

afterEach(() => {
  cleanup()
  realtime.sync.mockReset()
})

describe("storefront layout", () => {
  it("loads the storefront stylesheet with the layout", () => {
    expect(metadata.head?.()).toStrictEqual({ links: [{ href: storefrontCss, rel: "stylesheet" }] })
  })

  it("frames the page with the navigation and the footer", () => {
    renderLayout()

    expect(screen.getByTestId("storefront-navigation")).toBeInTheDocument()
    expect(screen.getByTestId("storefront-footer")).toBeInTheDocument()
  })

  it("renders the routed page between them", () => {
    renderLayout()

    expect(screen.getByTestId("storefront-outlet")).toBeInTheDocument()
  })

  it("tracks customer activity and warns about unavailable cart items", () => {
    renderLayout()

    expect(screen.getByTestId("activity-tracker")).toBeInTheDocument()
    expect(screen.getByTestId("availability-banner")).toBeInTheDocument()
  })

  it("subscribes to the storefront realtime hub", () => {
    renderLayout()

    expect(realtime.sync.mock.calls[0]?.[0]).toMatchObject({ hub: REALTIME_INVALIDATION_HUB.STOREFRONT })
  })

  it("declares the cart namespace for the whole storefront", () => {
    expect(Route.options.staticData?.namespaces).toStrictEqual(["pages.cart"])
  })
})

describe("storefront layout loader", () => {
  it("loads the collections the full-screen menu shows together with the page", async () => {
    const collections = [{ handle: "nowosci", id: "collection-1", image: "collections/arrivals.webp" }]
    menu.fetchCollections.mockResolvedValue(collections)
    const queryClient = new QueryClient()

    await metadata.loader?.({ context: { queryClient } })

    expect(menu.fetchCollections).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(COLLECTION_QUERY_KEYS.ALL)).toStrictEqual(collections)
  })

  it("still opens the page when the menu collections cannot be loaded, leaving the menu to ask again", async () => {
    menu.fetchCollections.mockRejectedValueOnce(new Error("D1 unavailable"))
    const queryClient = new QueryClient()

    await expect(metadata.loader?.({ context: { queryClient } })).resolves.toBeUndefined()
    expect(queryClient.getQueryState(COLLECTION_QUERY_KEYS.ALL)).toMatchObject({ data: undefined, status: "error" })
  })
})
