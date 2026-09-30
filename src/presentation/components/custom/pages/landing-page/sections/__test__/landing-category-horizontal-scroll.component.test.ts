import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const gsapMock = vi.hoisted(() => ({
  delayedCall: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("~/src/integrations/gsap/gsap.config", () => ({
  ScrollTrigger: { refresh: gsapMock.refresh },
  gsap: { delayedCall: gsapMock.delayedCall },
}))

import {
  canRunHorizontalCategoryScroll,
  countHorizontalSlides,
  getHorizontalSlideTransitions,
  observeHorizontalCategoryScrollLayout,
  refreshHorizontalCategoryScroll,
  resolveHorizontalScrollEnd,
  resolveHorizontalTrackOffset,
  scheduleHorizontalCategoryScrollRefresh,
} from "~/src/presentation/components/custom/pages/landing-page/sections/landing-category-horizontal-scroll"

const observedElements: Element[] = []
const disconnectSpy = vi.fn()

class TestResizeObserver {
  observe(target: Element): void {
    observedElements.push(target)
  }

  disconnect(): void {
    disconnectSpy()
  }
}

const buildTrackWithSlides = (slideCount: number): { readonly slides: readonly HTMLElement[]; readonly track: HTMLElement } => {
  const slides = Array.from({ length: slideCount }, () => {
    const slide = document.createElement("article")
    slide.replaceChildren(document.createElement("div"))

    return slide
  })
  const track = document.createElement("div")
  track.replaceChildren(...slides)
  document.body.replaceChildren(track)

  return { slides, track }
}

const buildTrack = (slideCount: number): HTMLElement => buildTrackWithSlides(slideCount).track

const setLayout = (element: HTMLElement, property: "clientWidth" | "scrollWidth", value: number): void => {
  Object.defineProperty(element, property, { configurable: true, value })
}

describe("countHorizontalSlides", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("counts only direct article children", () => {
    const { slides, track } = buildTrackWithSlides(3)
    const nested = document.createElement("article")

    slides[0]?.replaceChildren(nested)

    expect(countHorizontalSlides(track)).toBe(3)
  })

  it("returns zero for a track with no slides", () => {
    expect(countHorizontalSlides(buildTrack(0))).toBe(0)
  })
})

describe("getHorizontalSlideTransitions", () => {
  it("is one less than the slide count", () => {
    expect(getHorizontalSlideTransitions(4)).toBe(3)
  })

  it("never goes below zero", () => {
    expect(getHorizontalSlideTransitions(0)).toBe(0)
    expect(getHorizontalSlideTransitions(1)).toBe(0)
  })
})

describe("canRunHorizontalCategoryScroll", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("needs at least two slides", () => {
    expect(canRunHorizontalCategoryScroll(buildTrack(1))).toBe(false)
  })

  it("runs from two slides upwards", () => {
    expect(canRunHorizontalCategoryScroll(buildTrack(2))).toBe(true)
    expect(canRunHorizontalCategoryScroll(buildTrack(5))).toBe(true)
  })
})

describe("resolveHorizontalTrackOffset", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("is the negative overflow of the track beyond the section", () => {
    const track = buildTrack(3)
    const section = document.createElement("section")
    setLayout(track, "scrollWidth", 3000)
    setLayout(section, "clientWidth", 1000)

    expect(resolveHorizontalTrackOffset(track, section)).toBe(-2000)
  })

  it("does not shift the track when it fits the section", () => {
    const track = buildTrack(1)
    const section = document.createElement("section")
    setLayout(track, "scrollWidth", 800)
    setLayout(section, "clientWidth", 800)

    expect(Math.abs(resolveHorizontalTrackOffset(track, section))).toBe(0)
  })
})

describe("resolveHorizontalScrollEnd", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("scrolls one viewport height per slide transition", () => {
    expect(resolveHorizontalScrollEnd(buildTrack(4))).toBe(`+=${3 * window.innerHeight}`)
  })

  it("stays at zero for a single slide", () => {
    expect(resolveHorizontalScrollEnd(buildTrack(1))).toBe("+=0")
  })
})

describe("observeHorizontalCategoryScrollLayout", () => {
  beforeEach(() => {
    observedElements.length = 0
    disconnectSpy.mockClear()
    vi.stubGlobal("ResizeObserver", TestResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ""
  })

  it("observes the track for resizes", () => {
    const track = buildTrack(2)
    observeHorizontalCategoryScrollLayout(
      track,
      vi.fn(() => {}),
    )

    expect(observedElements).toStrictEqual([track])
  })

  it("notifies on layout change for pending images only", () => {
    const { slides, track } = buildTrackWithSlides(1)
    const pending = document.createElement("img")
    Object.defineProperty(pending, "complete", { configurable: true, value: false })
    const loaded = document.createElement("img")
    Object.defineProperty(loaded, "complete", { configurable: true, value: true })
    track.replaceChildren(...slides, pending, loaded)

    const onLayoutChange = vi.fn(() => {})
    observeHorizontalCategoryScrollLayout(track, onLayoutChange)

    loaded.dispatchEvent(new Event("load"))

    expect(onLayoutChange).not.toHaveBeenCalled()

    pending.dispatchEvent(new Event("load"))

    expect(onLayoutChange).toHaveBeenCalledTimes(1)
  })

  it("stops observing and drops image listeners on cleanup", () => {
    const { slides, track } = buildTrackWithSlides(1)
    const pending = document.createElement("img")
    Object.defineProperty(pending, "complete", { configurable: true, value: false })
    track.replaceChildren(...slides, pending)

    const onLayoutChange = vi.fn(() => {})
    const cleanup = observeHorizontalCategoryScrollLayout(track, onLayoutChange)
    cleanup()

    pending.dispatchEvent(new Event("load"))

    expect(disconnectSpy).toHaveBeenCalledTimes(1)
    expect(onLayoutChange).not.toHaveBeenCalled()
  })
})

describe("refreshHorizontalCategoryScroll", () => {
  beforeEach(() => {
    gsapMock.refresh.mockClear()
    gsapMock.delayedCall.mockClear()
  })

  it("refreshes the scroll triggers", () => {
    refreshHorizontalCategoryScroll()

    expect(gsapMock.refresh).toHaveBeenCalledTimes(1)
  })

  it("schedules a refresh on the next frame", () => {
    scheduleHorizontalCategoryScrollRefresh()

    expect(gsapMock.delayedCall).toHaveBeenCalledWith(0, refreshHorizontalCategoryScroll)
  })
})
