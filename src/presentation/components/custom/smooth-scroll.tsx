import { type ReactNode, useEffect, useSyncExternalStore } from "react"

import type Lenis from "lenis"

import { type GsapToolkit, loadGsap } from "~/src/integrations/gsap/gsap.loader"
import { setLenisInstance } from "~/src/integrations/lenis/lenis.instance"

import { useLenisRouterScrollSync } from "~/src/hooks/use-lenis-router-scroll-sync"

const SMOOTH_SCROLL_MEDIA_QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"

const subscribeToSmoothScrollMedia = (listener: () => void): (() => void) => {
  const media = globalThis.matchMedia(SMOOTH_SCROLL_MEDIA_QUERY)
  media.addEventListener("change", listener)

  return () => {
    media.removeEventListener("change", listener)
  }
}

const prefersSmoothScroll = (): boolean => globalThis.matchMedia(SMOOTH_SCROLL_MEDIA_QUERY).matches

const noSmoothScrollOnServer = (): boolean => false

const isPageScrollLocked = (): boolean => [document.documentElement, document.body].some((element) => element.style.overflowY === "hidden")

const stopInertiaOnPress = (lenis: Lenis): (() => void) => {
  const handlePointerDown = () => {
    const isGlidingTowardsWheelTarget = lenis.isScrolling === "smooth" && lenis.targetScroll !== lenis.scroll
    if (isGlidingTowardsWheelTarget) {
      lenis.scrollTo(lenis.scroll, {
        force: true,
        immediate: true,
      })
    }
  }
  globalThis.addEventListener("pointerdown", handlePointerDown, { capture: true })

  return () => {
    globalThis.removeEventListener("pointerdown", handlePointerDown, { capture: true })
  }
}

const startSmoothScroll = (LenisScroller: typeof Lenis, { ScrollTrigger, gsap }: GsapToolkit): (() => void) => {
  const lenis = new LenisScroller({
    autoRaf: false,
    lerp: 0.09,
    touchMultiplier: 2,
    virtualScroll: () => !isPageScrollLocked(),
    wheelMultiplier: 1,
  })
  setLenisInstance(lenis)
  lenis.on("scroll", () => {
    ScrollTrigger.update()
  })
  const clearInertiaStop = stopInertiaOnPress(lenis)
  const raf = (time: number) => {
    lenis.raf(time * MS_PER_S)
  }
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(ZERO_LAG)

  return () => {
    gsap.ticker.remove(raf)
    clearInertiaStop()
    lenis.destroy()
    setLenisInstance(undefined)
  }
}

export const SmoothScroll = ({
  children,
}: Readonly<{
  children: ReactNode
}>): ReactNode => {
  const smoothScrollAllowed = useSyncExternalStore(subscribeToSmoothScrollMedia, prefersSmoothScroll, noSmoothScrollOnServer)
  useLenisRouterScrollSync()
  useEffect(() => {
    if (!smoothScrollAllowed) {
      return
    }
    const session: { active: boolean; stop: (() => void) | undefined } = { active: true, stop: undefined }
    void Promise.all([import("lenis"), loadGsap()]).then(([{ default: LenisScroller }, toolkit]) => {
      if (session.active) {
        session.stop = startSmoothScroll(LenisScroller, toolkit)
      }
    })

    return () => {
      session.active = false
      session.stop?.()
    }
  }, [smoothScrollAllowed])

  return children
}

const MS_PER_S = 1000

const ZERO_LAG = 0
