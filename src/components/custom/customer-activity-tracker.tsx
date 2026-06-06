import { type JSX, useEffect, useRef } from "react";

import { useRouterState } from "@tanstack/react-router";

import { useSession } from "~/src/integrations/better-auth/auth._client";

import {
  resetCartAbandonedTracking,
  shouldTrackStorefrontPath,
  trackCartAbandoned,
  trackPageViewed
} from "~/src/lib/customer-activity/customer-activity.tracking";

import { useCartStore } from "~/src/stores/cart.store";

const INITIAL_COUNT = 0;
const INITIAL_PATH = "";
const VISIBILITY_HIDDEN = "hidden";

export function CustomerActivityTracker(): JSX.Element | undefined {
  const { data: session } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = useCartStore((state) => state.items);
  const previousPathRef = useRef<string>(INITIAL_PATH);

  useEffect(() => {
    if (session?.user === undefined) {
      return;
    }

    if (!shouldTrackStorefrontPath(pathname) || pathname === previousPathRef.current) {
      return;
    }

    previousPathRef.current = pathname;
    trackPageViewed(pathname);
  }, [pathname, session?.user]);

  useEffect(() => {
    if (session?.user === undefined) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== VISIBILITY_HIDDEN) {
        return;
      }

      const itemCount = items.reduce((sum, item) => sum + item.qty, INITIAL_COUNT);
      if (itemCount === INITIAL_COUNT) {
        return;
      }

      trackCartAbandoned({
        itemCount,
        lineCount: items.length
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [items, session?.user]);

  useEffect(() => {
    const itemCount = items.reduce((sum, item) => sum + item.qty, INITIAL_COUNT);
    if (itemCount === INITIAL_COUNT) {
      resetCartAbandonedTracking();
    }
  }, [items]);

  return undefined;
}
