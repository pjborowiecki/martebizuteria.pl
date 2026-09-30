import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const realtime = vi.hoisted(() => ({
  sync: vi.fn<(options: { readonly hub: string; readonly subscriptions: readonly unknown[] }) => void>(),
}))

const metadata = vi.hoisted(() => ({ head: undefined as (() => { links: { href: string; rel: string }[] }) | undefined }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return {
    ...actual,
    createFileRoute: () => (options: { head: () => { links: { href: string; rel: string }[] } }) => {
      metadata.head = options.head

      return { options }
    },
    Outlet: (): JSX.Element => <div data-testid="storefront-outlet" />,
  }
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
