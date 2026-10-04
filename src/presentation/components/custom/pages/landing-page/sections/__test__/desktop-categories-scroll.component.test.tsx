import { act, cleanup, screen } from "@testing-library/react"
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

const category = (id: string, handle: string, title: string): CategoryRow => ({
  handle,
  id,
  image: `https://images.test/${handle}.webp`,
  shortDescriptions: { "en-US": "Close to the heart", "pl-PL": "Blisko serca" },
  subtitles: { "en-US": "Refined simplicity", "pl-PL": "Wyrafinowana prostota" },
  titles: { "en-US": title, "pl-PL": title },
})

interface ScrollTriggerConfig {
  readonly end?: () => string
  readonly id?: string
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

interface UseGsapConfig {
  readonly dependencies?: readonly unknown[]
  readonly revertOnUpdate?: boolean
}

const catalogue = vi.hoisted(() => ({ rows: [] as unknown[] }))

const scrollTrigger = vi.hoisted(() => ({
  delayedCall: vi.fn(),
  getById: vi.fn<(id: string) => { end: number; start: number } | undefined>(),
  refresh: vi.fn(),
}))

const lenis = vi.hoisted(() => ({ scrollTo: vi.fn<(top: number, options: { immediate: boolean }) => void>() }))

const captured = vi.hoisted(() => ({
  configs: [] as UseGsapConfig[],
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
vi.mock("~/src/integrations/lenis/lenis.instance", () => ({ getLenisInstance: () => lenis }))
vi.mock("~/src/integrations/gsap/gsap.config", async () => {
  const { useLayoutEffect } = await import("react")

  return {
    ScrollTrigger: { getById: scrollTrigger.getById, refresh: scrollTrigger.refresh },
    gsap: {
      delayedCall: scrollTrigger.delayedCall,
      matchMedia: () => ({
        add: (query: string, callback: () => void) => {
          captured.queries.push(query)
          callback()
        },
      }),
      to: (target: unknown, vars: AnimationVars) => {
        captured.targets.push(target)
        captured.vars.push(vars)

        return { kill: vi.fn(), scrollTrigger: { kill: vi.fn() } }
      },
    },
    useGSAP: (callback: () => void, config: UseGsapConfig) => {
      captured.configs.push(config)
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

const PIN = { end: 3800, start: 2000 }

const PANEL_WIDTH_PX = 1440

const SECTION_WIDTH_BESIDE_SCROLLBAR_PX = 1425

const renderSection = async () => {
  const view = renderWithProviders(<DesktopCategoriesSection />)
  await screen.findByRole("heading", { level: 2 })

  return view
}

const focusLink = (name: string): HTMLElement => {
  const link = screen.getByRole("link", { name })
  act(() => {
    link.focus()
  })

  return link
}

const switchToAnotherWindowAndBack = (link: HTMLElement): void => {
  act(() => {
    link.dispatchEvent(new FocusEvent("blur"))
    link.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
    link.dispatchEvent(new FocusEvent("focus"))
    link.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
  })
}

const layOutPanelsSideBySide = (container: HTMLElement, sectionWidth: number): void => {
  const section = container.querySelector("section")
  const track = container.querySelector(".horizontal-track")
  if (section === null || track === null) {
    throw new Error("the section rendered no track")
  }
  const panels = [...track.children]
  for (const [index, panel] of panels.entries()) {
    Object.defineProperty(panel, "offsetLeft", { configurable: true, value: index * PANEL_WIDTH_PX })
  }
  Object.defineProperty(track, "scrollWidth", { configurable: true, value: panels.length * PANEL_WIDTH_PX })
  Object.defineProperty(section, "clientWidth", { configurable: true, value: sectionWidth })
}

const scrollVars = () => {
  const [vars] = captured.vars
  if (vars === undefined) {
    throw new Error("the horizontal scroll animation was never created")
  }

  return vars
}

const scrollTriggerVars = (): ScrollTriggerConfig => {
  const { scrollTrigger: config } = scrollVars()
  if (config === undefined) {
    throw new Error("the animation carries no scroll trigger configuration")
  }

  return config
}

beforeEach(() => {
  vi.clearAllMocks()
  captured.configs.length = 0
  captured.queries.length = 0
  captured.targets.length = 0
  captured.vars.length = 0
  scrollTrigger.getById.mockReturnValue(PIN)
  catalogue.rows = [category("cat_1", "naszyjniki", "Necklaces"), category("cat_2", "bransoletki", "Bracelets")]
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

  it("pins the section from the top of the viewport under an id the keyboard can find, and recalculates on refresh", async () => {
    const { container } = await renderSection()

    const config = scrollTriggerVars()

    expect(config.id).toBe("landing-categories")
    expect(config.invalidateOnRefresh).toBe(true)
    expect(config.pin).toBe(true)
    expect(config.scrub).toBe(true)
    expect(config.start).toBe("top top")
    expect(config.trigger).toBe(container.querySelector("section"))
  })

  it("pins without anticipating the pin, so the section does not jump just before it locks", async () => {
    await renderSection()

    expect(scrollTriggerVars()).not.toHaveProperty("anticipatePin")
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

  it("throws the previous scroll away before building one for a changed catalogue", async () => {
    await renderSection()

    expect(captured.configs.at(-1)?.revertOnUpdate).toBe(true)
  })

  it("sets no scroll up at all while the catalogue is empty", async () => {
    catalogue.rows = []

    await renderSection()

    expect(captured.queries).toStrictEqual([])
    expect(captured.vars).toStrictEqual([])
  })
})

describe("desktop categories while the shopper scrolls", () => {
  it("does not refresh the scroll triggers when a category image loads", async () => {
    const { container } = await renderSection()

    act(() => {
      for (const image of container.querySelectorAll("img")) {
        image.dispatchEvent(new Event("load"))
      }
    })

    expect(container.querySelectorAll("img")).not.toHaveLength(0)
    expect(scrollTrigger.refresh).not.toHaveBeenCalled()
  })

  it("schedules no refresh of its own once the track is laid out", async () => {
    await renderSection()

    expect(scrollTrigger.delayedCall).not.toHaveBeenCalled()
    expect(scrollTrigger.refresh).not.toHaveBeenCalled()
  })
})

describe("desktop categories layout", () => {
  it("clips the panels rather than scrolling them, so focus cannot shift them under the animation", async () => {
    const { container } = await renderSection()
    const section = container.querySelector("section")

    expect(section).toHaveClass("overflow-clip")
    expect(section).not.toHaveClass("overflow-hidden")
  })

  it("gives way to the stacked layout on wide screens for shoppers who ask for reduced motion", async () => {
    const { container } = await renderSection()

    expect(container.querySelector("section")).toHaveClass("hidden", "lg:block", "motion-reduce:lg:hidden")
  })
})

describe("desktop categories keyboard focus", () => {
  it("slides the panel that receives keyboard focus to the left edge of the screen", async () => {
    const { container } = await renderSection()
    layOutPanelsSideBySide(container, PANEL_WIDTH_PX)

    focusLink("Discover Necklaces")

    expect(scrollTrigger.getById).toHaveBeenCalledWith("landing-categories")
    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(2900, { immediate: true })
  })

  it("scrolls to the end of the pin for the last panel", async () => {
    const { container } = await renderSection()
    layOutPanelsSideBySide(container, PANEL_WIDTH_PX)

    focusLink("Discover Bracelets")

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(PIN.end, { immediate: true })
  })

  it("measures the track's real travel when a scrollbar leaves the section narrower than its panels", async () => {
    const { container } = await renderSection()
    layOutPanelsSideBySide(container, SECTION_WIDTH_BESIDE_SCROLLBAR_PX)

    focusLink("Discover Bracelets")

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(
      PIN.start + ((PIN.end - PIN.start) * 2 * PANEL_WIDTH_PX) / (3 * PANEL_WIDTH_PX - SECTION_WIDTH_BESIDE_SCROLLBAR_PX),
      { immediate: true },
    )
  })

  it("leaves the page alone when the link takes focus from a pointer", async () => {
    const { container } = await renderSection()
    layOutPanelsSideBySide(container, PANEL_WIDTH_PX)
    const link = screen.getByRole("link", { name: "Discover Necklaces" })
    vi.spyOn(link, "matches").mockImplementation((selector) => selector !== ":focus-visible")

    act(() => {
      link.focus()
    })

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })

  it("leaves the page where the shopper scrolled it when focus returns to the link from another window", async () => {
    const { container } = await renderSection()
    layOutPanelsSideBySide(container, PANEL_WIDTH_PX)
    const link = focusLink("Discover Necklaces")
    lenis.scrollTo.mockClear()

    switchToAnotherWindowAndBack(link)

    expect(link).toHaveFocus()
    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })

  it("still slides in the next panel when a click beside the links drops focus and Tab moves it on", async () => {
    const { container } = await renderSection()
    layOutPanelsSideBySide(container, PANEL_WIDTH_PX)
    const link = focusLink("Discover Necklaces")
    act(() => {
      link.blur()
    })
    lenis.scrollTo.mockClear()

    focusLink("Discover Bracelets")

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(PIN.end, { immediate: true })
  })

  it("slides the panel in again when Tab comes back to the link after the window switch", async () => {
    const { container } = await renderSection()
    layOutPanelsSideBySide(container, PANEL_WIDTH_PX)
    const necklaces = focusLink("Discover Necklaces")
    switchToAnotherWindowAndBack(necklaces)
    focusLink("Discover Bracelets")
    lenis.scrollTo.mockClear()

    focusLink("Discover Necklaces")

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(2900, { immediate: true })
  })

  it("leaves the page alone while the horizontal scroll is switched off", async () => {
    scrollTrigger.getById.mockReturnValue(undefined)
    await renderSection()

    focusLink("Discover Necklaces")

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })
})
