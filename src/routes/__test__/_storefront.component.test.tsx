import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { TEST_STORED_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

const realtime = vi.hoisted(() => ({
  sync: vi.fn<(options: { readonly hub: string; readonly subscriptions: readonly unknown[] }) => void>(),
}))

interface StorefrontRouteOptions {
  readonly loader: (args: { readonly context: { readonly queryClient: QueryClient } }) => Promise<unknown>
}

const metadata = vi.hoisted(() => ({
  loader: undefined as StorefrontRouteOptions["loader"] | undefined,
}))

const menu = vi.hoisted(() => ({ fetchCollections: vi.fn<() => Promise<unknown[]>>() }))

const sales = vi.hoisted(() => ({ fetchStatus: vi.fn<() => Promise<{ salesPaused: boolean }>>() }))

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return {
    ...actual,
    createFileRoute: () => (options: StorefrontRouteOptions) => {
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

vi.mock("~/src/modules/store-setting/use-cases/get-sales-status", async () => {
  const { STORE_SETTING_QUERY_KEYS: keys } = await import("~/src/modules/store-setting/store-setting.constants")

  return { getSalesStatusQuery: () => ({ queryFn: sales.fetchStatus, queryKey: keys.SALES }) }
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

vi.mock("~/src/presentation/components/custom/sales-paused-banner", () => ({
  SalesPausedBanner: (): JSX.Element => <div data-testid="sales-paused-banner" />,
}))

vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: (): JSX.Element => <nav data-testid="storefront-navigation" />,
}))

vi.mock("~/src/presentation/components/custom/pages/landing-page/footer/footer", () => ({
  Footer: (): JSX.Element => <footer data-testid="storefront-footer" />,
}))

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { Route } from "~/src/routes/_storefront"

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

  it("puts the paused-sales notice under the navigation, above the cart warning", () => {
    renderLayout()

    const notice = screen.getByTestId("sales-paused-banner")
    expect(screen.getByTestId("storefront-navigation").compareDocumentPosition(notice)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(notice.compareDocumentPosition(screen.getByTestId("availability-banner"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
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
  beforeEach(() => {
    menu.fetchCollections.mockResolvedValue([])
    sales.fetchStatus.mockResolvedValue({ salesPaused: false })
  })

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

  it("renders the page knowing whether sales are paused, so the notice is in the first paint", async () => {
    sales.fetchStatus.mockResolvedValue({ salesPaused: true })
    const queryClient = new QueryClient()

    await metadata.loader?.({ context: { queryClient } })

    expect(queryClient.getQueryData(STORE_SETTING_QUERY_KEYS.SALES)).toStrictEqual({ salesPaused: true })
  })

  it("still opens the page when the sales status cannot be read, leaving the notice to ask again", async () => {
    sales.fetchStatus.mockRejectedValueOnce(new Error("D1 unavailable"))
    const queryClient = new QueryClient()

    await expect(metadata.loader?.({ context: { queryClient } })).resolves.toBeUndefined()
    expect(queryClient.getQueryState(STORE_SETTING_QUERY_KEYS.SALES)).toMatchObject({ data: undefined, status: "error" })
  })

  it("renders the page with the seller's stored details, so the footer names the seller in the first paint", async () => {
    const queryClient = new QueryClient()

    await metadata.loader?.({ context: { queryClient } })

    expect(queryClient.getQueryData(STORE_SETTING_QUERY_KEYS.SELLER_DETAILS)).toStrictEqual(TEST_STORED_SELLER_DETAILS)
  })
})
