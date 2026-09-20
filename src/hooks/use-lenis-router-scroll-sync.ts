import { useEffect, useRef } from "react"

import { useRouter, useRouterState } from "@tanstack/react-router"

import { catalogDebugLog } from "~/src/lib/dev/catalog-debug-log"
import { ScrollTrigger } from "~/src/lib/gsap"
import { getLenisInstance, syncLenisToWindowScroll } from "~/src/lib/lenis/lenis-instance"
const cleanupDetachedScrollTriggers = (): void => {
  ScrollTrigger.getAll().forEach((trigger) => {
    const element = trigger.trigger
    if (element instanceof Element && !document.contains(element)) {
      trigger.kill(false)
    }
  })
}
// Router restores native scroll; Lenis must also reset its animated position.
export const useLenisRouterScrollSync = (): void => {
  const router = useRouter()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  useEffect(() => {
    const unsubscribeBeforeLoad = router.subscribe("onBeforeLoad", (event) => {
      const fromPathname = event.fromLocation?.pathname ?? pathnameRef.current
      const toPathname = event.toLocation.pathname
      if (fromPathname === toPathname) {
        return
      }
      const lenis = getLenisInstance()
      if (lenis === undefined) {
        return
      }
      catalogDebugLog("lenis.beforeLoad", {
        from: fromPathname,
        stopped: lenis.isStopped,
        to: toPathname,
      })
      lenis.scrollTo(lenis.scroll, {
        force: true,
        immediate: true,
      })
      lenis.stop()
    })
    const unsubscribeRendered = router.subscribe("onRendered", (event) => {
      const fromPathname = event.fromLocation?.pathname
      const toPathname = event.toLocation.pathname
      const pathnameChanged = fromPathname !== undefined && fromPathname !== toPathname
      const lenis = getLenisInstance()
      if (lenis === undefined) {
        return
      }
      if (lenis.isStopped) {
        lenis.start()
      }
      catalogDebugLog("lenis.rendered", {
        from: fromPathname,
        pathnameChanged,
        stopped: lenis.isStopped,
        to: toPathname,
      })
      syncLenisToWindowScroll()
      requestAnimationFrame(() => {
        cleanupDetachedScrollTriggers()
        syncLenisToWindowScroll()
        ScrollTrigger.refresh()
      })
    })
    return () => {
      unsubscribeBeforeLoad()
      unsubscribeRendered()
    }
  }, [router])
}
