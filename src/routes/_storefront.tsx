import { type JSX } from "react"

import { noop } from "@tanstack/react-query"
import { Outlet, createFileRoute } from "@tanstack/react-router"

import {
  REALTIME_INVALIDATION_HUB,
  STOREFRONT_REALTIME_QUERY_PREFIXES,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"

import { useRealtimeQuerySync } from "~/src/hooks/use-realtime-query-sync"

import { CartAvailabilityBanner } from "~/src/presentation/components/custom/cart-availability-banner"
import { CustomerActivityTracker } from "~/src/presentation/components/custom/customer-activity-tracker"
import { Footer } from "~/src/presentation/components/custom/pages/landing-page/footer/footer"
import { Navigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation"

import storefrontCss from "~/src/presentation/styles/storefront.css?url"

const StorefrontLayout = (): JSX.Element => {
  useRealtimeQuerySync({
    hub: REALTIME_INVALIDATION_HUB.STOREFRONT,
    subscriptions: STOREFRONT_REALTIME_QUERY_PREFIXES,
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <CustomerActivityTracker />
      <Navigation />
      <CartAvailabilityBanner />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}

export const Route = createFileRoute("/_storefront")({
  component: StorefrontLayout,
  head: () => ({
    links: [
      {
        href: storefrontCss,
        rel: "stylesheet",
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient
      .query({
        ...getCollectionsQuery(),
        staleTime: "static",
      })
      .catch(noop)
  },
  staticData: {
    namespaces: ["pages.cart"],
  },
})
