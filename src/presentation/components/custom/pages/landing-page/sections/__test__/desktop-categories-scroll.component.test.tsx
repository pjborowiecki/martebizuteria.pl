import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

vi.hoisted(() => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })
})

interface CategoryRow {
  readonly handle: string
  readonly id: string
  readonly image: string
  readonly shortDescriptions: Record<string, string>
  readonly subtitles: Record<string, string>
  readonly titles: Record<string, string>
}

const category = (id: string, handle: string): CategoryRow => ({
  handle,
  id,
  image: `https://images.test/${handle}.webp`,
  shortDescriptions: { "en-US": "Close to the heart", "pl-PL": "Blisko serca" },
  subtitles: { "en-US": "Refined simplicity", "pl-PL": "Wyrafinowana prostota" },
  titles: { "en-US": "Necklaces", "pl-PL": "Naszyjniki" },
})

interface ScrollTriggerConfig {
  readonly anticipatePin?: number
  readonly end?: () => string
  readonly invalidateOnRefresh?: boolean
  readonly pin?: boolean
  readonly scrub?: boolean
  readonly start?: string
  readonly trigger?: unknown
}

interface AnimationVars {
  readonly ease?: string
  readonly scrollTrigger?: ScrollTriggerConfig
  readonly x?: () => number
}

const catalogue = vi.hoisted(() => ({ rows: [] as unknown[] }))

const animation = vi.hoisted(() => ({
  delayedCall: vi.fn(),
  hasScrollTrigger: true,
  killAnimation: vi.fn(),
  killTrigger: vi.fn(),
  refresh: vi.fn(),
}))

const captured = vi.hoisted(() => ({
  cleanups: [] as (() => void)[],
  queries: [] as string[],
  targets: [] as unknown[],
  vars: [] as AnimationVars[],
}))

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  getCategoriesQuery: () => ({ queryFn: () => Promise.resolve(catalogue.rows), queryKey: ["categories", catalogue.rows.length] }),
}))
vi.mock("~/src/integrations/gsap/gsap.config", async () => {
  const { useLayoutEffect } = await import("react")

  return {
    ScrollTrigger: { refresh: animation.refresh },
    gsap: {
      delayedCall: animation.delayedCall,
      matchMedia: () => ({
        add: (query: string, callback: () => (() => void) | void) => {
          captured.queries.push(query)
          const teardown = callback()
          if (typeof teardown === "function") {
            captured.cleanups.push(teardown)
          }
        },
      }),
      to: (target: unknown, vars: AnimationVars) => {
        captured.targets.push(target)
        captured.vars.push(vars)

        return {
          kill: animation.killAnimation,
          scrollTrigger: animation.hasScrollTrigger ? { kill: animation.killTrigger } : undefined,
        }
      },
    },
    useGSAP: (callback: () => void) => {
      useLayoutEffect(() => {
        callback()
      }, [callback])
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DesktopCategoriesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/desktop-categories-section"
import {
  resolveHorizontalScrollEnd,
  resolveHorizontalTrackOffset,
} from "~/src/presentation/components/custom/pages/landing-page/sections/landing-category-horizontal-scroll"

const renderSection = async () => {
  const view = renderWithProviders(<DesktopCategoriesSection />)
  await screen.findByRole("heading", { level: 2 })

  return view
}

const scrollVars = () => {
  const [vars] = captured.vars
  if (vars === undefined) {
    throw new Error("the horizontal scroll animation was never created")
  }

  return vars
}

const scrollTriggerVars = (): ScrollTriggerConfig => {
  const { scrollTrigger } = scrollVars()
  if (scrollTrigger === undefined) {
    throw new Error("the animation carries no scroll trigger configuration")
  }

  return scrollTrigger
}

beforeEach(() => {
  vi.clearAllMocks()
  captured.cleanups.length = 0
  captured.queries.length = 0
  captured.targets.length = 0
  captured.vars.length = 0
  animation.hasScrollTrigger = true
  catalogue.rows = [category("cat_1", "naszyjniki"), category("cat_2", "bransoletki")]
})

afterEach(() => {
  cleanup()
})

describe("desktop categories horizontal scroll", () => {
  it("runs only on wide screens for shoppers who accept motion", async () => {
    await renderSection()

    expect(captured.queries).toStrictEqual(["(min-width: 1024px) and (prefers-reduced-motion: no-preference)"])
  })

  it("scrubs the track rather than the section", async () => {
    const { container } = await renderSection()

    expect(captured.targets[0]).toBe(container.querySelector(".horizontal-track"))
  })

  it("pins the section from the top of the viewport and recalculates on refresh", async () => {
    const { container } = await renderSection()

    const config = scrollTriggerVars()

    expect(config.anticipatePin).toBe(1)
    expect(config.invalidateOnRefresh).toBe(true)
    expect(config.pin).toBe(true)
    expect(config.scrub).toBe(true)
    expect(config.start).toBe("top top")
    expect(config.trigger).toBe(container.querySelector("section"))
  })

  it("animates without easing so the scroll position drives it", async () => {
    await renderSection()

    expect(scrollVars().ease).toBe("none")
  })

  it("derives the scroll distance from the track width", async () => {
    const { container } = await renderSection()
    const track = container.querySelector(".horizontal-track")
    const { end } = scrollTriggerVars()
    if (end === undefined || !(track instanceof HTMLElement)) {
      throw new Error("the scroll trigger declares no end callback")
    }

    expect(end()).toBe(resolveHorizontalScrollEnd(track))
  })

  it("derives the horizontal offset from the track and the section", async () => {
    const { container } = await renderSection()
    const track = container.querySelector(".horizontal-track")
    const section = container.querySelector("section")
    const { x: offset } = scrollVars()
    if (offset === undefined || !(track instanceof HTMLElement) || !(section instanceof HTMLElement)) {
      throw new Error("the animation declares no offset callback")
    }

    expect(offset()).toBe(resolveHorizontalTrackOffset(track, section))
  })

  it("schedules a trigger refresh once the track is laid out", async () => {
    await renderSection()

    expect(animation.delayedCall).toHaveBeenCalledOnce()
    expect(animation.delayedCall.mock.calls[0]?.[0]).toBe(0)
  })

  it("tears the trigger and the animation down together", async () => {
    await renderSection()
    const [teardown] = captured.cleanups
    if (teardown === undefined) {
      throw new Error("the media query registered no teardown")
    }

    teardown()

    expect(animation.killTrigger).toHaveBeenCalledOnce()
    expect(animation.killAnimation).toHaveBeenCalledOnce()
  })

  it("throws the animation away when it never got a scroll trigger", async () => {
    animation.hasScrollTrigger = false

    await renderSection()

    expect(animation.killAnimation).toHaveBeenCalledOnce()
    expect(animation.killTrigger).not.toHaveBeenCalled()
  })

  it("leaves a harmless teardown behind when there is no trigger to kill", async () => {
    animation.hasScrollTrigger = false
    await renderSection()
    const [teardown] = captured.cleanups
    if (teardown === undefined) {
      throw new Error("the media query registered no teardown")
    }

    teardown()

    expect(animation.killTrigger).not.toHaveBeenCalled()
  })

  it("sets no scroll up at all while the catalogue is empty", async () => {
    catalogue.rows = []

    await renderSection()

    expect(captured.queries).toStrictEqual([])
    expect(captured.vars).toStrictEqual([])
  })
})
