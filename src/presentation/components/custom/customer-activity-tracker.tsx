import { type JSX, useEffect, useRef } from "react"

import { useQuery } from "@tanstack/react-query"
import { useRouteContext } from "@tanstack/react-router"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { useCartStore } from "~/src/modules/cart/cart.store"
import {
  resetCartAbandonedTracking,
  shouldTrackStorefrontPath,
  trackCartAbandoned,
  trackPageViewed,
} from "~/src/modules/customer-activity/customer-activity.tracking"

export const CustomerActivityTracker = (): JSX.Element | undefined => {
  const { data: session } = useQuery(getCurrentSessionQuery)
  const pathname = useRouteContext({
    from: "__root__",
    select: (context) => context.internalPathname,
  })

  const items = useCartStore((state) => state.items)
  const previousPathRef = useRef<string>(INITIAL_PATH)
  useEffect(() => {
    if (session?.user === undefined) {
      return
    }

    if (!shouldTrackStorefrontPath(pathname) || pathname === previousPathRef.current) {
      return
    }
    previousPathRef.current = pathname
    trackPageViewed(pathname)
  }, [pathname, session?.user])
  useEffect(() => {
    if (session?.user === undefined) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== VISIBILITY_HIDDEN) {
        return
      }

      const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
      if (itemCount === 0) {
        return
      }
      trackCartAbandoned({
        itemCount,
        lineCount: items.length,
      })
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [items, session?.user])
  useEffect(() => {
    const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
    if (itemCount === 0) {
      resetCartAbandonedTracking()
    }
  }, [items])

  return undefined
}

const INITIAL_PATH = ""

const VISIBILITY_HIDDEN = "hidden"
