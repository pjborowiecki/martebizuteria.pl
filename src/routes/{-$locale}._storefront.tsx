import type { JSX } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";

import {
  REALTIME_INVALIDATION_HUB,
  STOREFRONT_REALTIME_QUERY_PREFIXES
} from "~/src/lib/realtime-invalidation/realtime-invalidation.subscriptions";

import { CartAvailabilityBanner } from "~/src/components/custom/cart-availability-banner";
import { CustomerActivityTracker } from "~/src/components/custom/customer-activity-tracker";
import { Footer } from "~/src/components/custom/pages/landing-page/footer/footer";
import { Navigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation";

import { useRealtimeQuerySync } from "~/src/hooks/use-realtime-query-sync";

export const Route = createFileRoute("/{-$locale}/_storefront")({
  component: StorefrontLayout
});

function StorefrontLayout(): JSX.Element {
  useRealtimeQuerySync({
    hub: REALTIME_INVALIDATION_HUB.STOREFRONT,
    subscriptions: STOREFRONT_REALTIME_QUERY_PREFIXES
  });

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
  );
}
