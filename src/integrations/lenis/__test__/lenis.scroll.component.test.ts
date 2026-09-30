import Lenis from "lenis"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { setLenisInstance } from "~/src/integrations/lenis/lenis.instance"
import { scrollToSectionById, scrollToSectionElement } from "~/src/integrations/lenis/lenis.scroll"

const HEADER_OFFSET_PX = 64

const SECTION_TOP_PX = 320

const stubEnvironment = (prefersReducedMotion: boolean): void => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: prefersReducedMotion, media: query }))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
}

const createSection = (id: string): HTMLElement => {
  document.body.innerHTML = `<section id="${id}"></section>`
  const element = document.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
  if (element === null) {
    throw new Error(`Section ${id} was not created`)
  }
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, SECTION_TOP_PX, 0, 0))

  return element
}

const registerLenis = () => {
  const lenis = new Lenis({ autoRaf: false })
  const scrollTo = vi.spyOn(lenis, "scrollTo").mockImplementation(() => {})
  setLenisInstance(lenis)

  return scrollTo
}

const spyOnPageScroll = () => vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})

beforeEach(() => {
  setLenisInstance(undefined)
  document.body.innerHTML = ""
})

afterEach(() => {
  setLenisInstance(undefined)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("scrollToSectionElement with Lenis driving the page", () => {
  it("animates to the element and leaves room for the sticky header", () => {
    stubEnvironment(false)
    const scrollTo = registerLenis()
    const element = createSection("features")

    scrollToSectionElement(element, HEADER_OFFSET_PX)

    expect(scrollTo).toHaveBeenCalledWith(element, { duration: 0.9, immediate: false, offset: -HEADER_OFFSET_PX })
  })

  it("jumps without animation when the visitor asks for reduced motion", () => {
    stubEnvironment(true)
    const scrollTo = registerLenis()
    const element = createSection("features")

    scrollToSectionElement(element, HEADER_OFFSET_PX)

    expect(scrollTo).toHaveBeenCalledWith(element, { duration: 0, immediate: true, offset: -HEADER_OFFSET_PX })
  })
})

describe("scrollToSectionElement without Lenis", () => {
  it("falls back to a smooth native scroll offset by the header", () => {
    stubEnvironment(false)
    const scrollTo = spyOnPageScroll()
    const element = createSection("features")

    scrollToSectionElement(element, HEADER_OFFSET_PX)

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "smooth", top: SECTION_TOP_PX - HEADER_OFFSET_PX })
  })

  it("adds the current scroll position to the element's viewport offset", () => {
    stubEnvironment(false)
    const scrollTo = spyOnPageScroll()
    vi.spyOn(globalThis, "scrollY", "get").mockReturnValue(1000)
    const element = createSection("features")

    scrollToSectionElement(element, HEADER_OFFSET_PX)

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "smooth", top: 1000 + SECTION_TOP_PX - HEADER_OFFSET_PX })
  })

  it("scrolls instantly when the visitor asks for reduced motion", () => {
    stubEnvironment(true)
    const scrollTo = spyOnPageScroll()
    const element = createSection("features")

    scrollToSectionElement(element, HEADER_OFFSET_PX)

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "instant", top: SECTION_TOP_PX - HEADER_OFFSET_PX })
  })
})

describe("scrollToSectionById", () => {
  it("returns the section it scrolled to", () => {
    stubEnvironment(false)
    spyOnPageScroll()
    const element = createSection("features")

    expect(scrollToSectionById("features", HEADER_OFFSET_PX)).toBe(element)
  })

  it("hands the section to Lenis when Lenis is driving the page", () => {
    stubEnvironment(false)
    const scrollTo = registerLenis()
    const element = createSection("features")

    scrollToSectionById("features", HEADER_OFFSET_PX)

    expect(scrollTo).toHaveBeenCalledWith(element, { duration: 0.9, immediate: false, offset: -HEADER_OFFSET_PX })
  })

  it("does nothing for an id that is not on the page", () => {
    stubEnvironment(false)
    const scrollTo = spyOnPageScroll()

    expect(scrollToSectionById("missing", HEADER_OFFSET_PX)).toBeUndefined()
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it("escapes an id that would otherwise break the selector", () => {
    stubEnvironment(false)
    spyOnPageScroll()
    const element = createSection("2024.report")

    expect(scrollToSectionById("2024.report", HEADER_OFFSET_PX)).toBe(element)
  })
})
