import { afterEach, describe, expect, it } from "vite-plus/test"

import {
  canRunHorizontalCategoryScroll,
  countHorizontalSlides,
  getHorizontalSlideTransitions,
  resolveHorizontalPanelScrollTop,
  resolveHorizontalScrollEnd,
  resolveHorizontalTrackOffset,
} from "~/src/presentation/components/custom/pages/landing-page/sections/landing-category-horizontal-scroll"

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

describe("resolveHorizontalPanelScrollTop", () => {
  const pin = { end: 2000 + 7 * 900, start: 2000 }

  it("is the start of the pin for the intro panel", () => {
    expect(resolveHorizontalPanelScrollTop(pin, 0, 7 * 1440)).toBe(2000)
  })

  it("is the scroll position at which the track has moved the panel to the left edge", () => {
    expect(resolveHorizontalPanelScrollTop(pin, 2 * 1440, 7 * 1440)).toBe(2000 + 2 * 900)
  })

  it("spreads the pin over the track's real travel when a scrollbar leaves the section narrower than its panels", () => {
    expect(resolveHorizontalPanelScrollTop({ end: 3800, start: 2000 }, 2 * 1440, 3 * 1440 - 1425)).toBeCloseTo(3790.67, 2)
  })
})
