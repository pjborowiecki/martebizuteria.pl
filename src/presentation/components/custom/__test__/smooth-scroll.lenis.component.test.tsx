import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type Lenis from "lenis"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getLenisInstance } from "~/src/integrations/lenis/lenis.instance"

const { ticker } = vi.hoisted(() => ({
  ticker: {
    add: vi.fn<(callback: (time: number) => void) => void>(),
    lagSmoothing: vi.fn<(threshold: number) => void>(),
    remove: vi.fn<(callback: (time: number) => void) => void>(),
  },
}))

vi.mock("~/src/integrations/gsap/gsap.config", () => ({
  ScrollTrigger: { update: vi.fn() },
  gsap: {
    registerPlugin: vi.fn(),
    ticker,
  },
}))
vi.mock("~/src/hooks/use-lenis-router-scroll-sync", () => ({ useLenisRouterScrollSync: vi.fn() }))

import { SmoothScroll } from "~/src/presentation/components/custom/smooth-scroll"

const PAGE_HEIGHT_PX = 4000

const WHEEL_DELTA_PX = 300

const SECTION_TOP_PX = 600

const SECTION_SCROLL_DURATION_S = 0.9

const FRAME_S = 1 / 60

const FRAMES_INTO_THE_SCROLL = 5

const FRAMES_TO_SETTLE = 90

const viewport = { scrollY: 0 }

vi.stubGlobal("Window", { [Symbol.hasInstance]: (candidate: unknown) => candidate === globalThis })
Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: PAGE_HEIGHT_PX })
Object.defineProperty(globalThis, "scrollY", { configurable: true, get: () => viewport.scrollY })
vi.stubGlobal("scrollTo", ({ top }: Readonly<{ top: number }>) => {
  viewport.scrollY = top
})

const clock = { seconds: 1 }

const renderWithLenis = (): Lenis => {
  render(<SmoothScroll>content</SmoothScroll>)
  const lenis = getLenisInstance()
  if (lenis === undefined) {
    throw new Error("SmoothScroll never published its Lenis instance")
  }
  ticker.add.mock.calls[0]?.[0](clock.seconds)

  return lenis
}

const runFrames = (count: number): void => {
  const frame = ticker.add.mock.calls[0]?.[0]
  for (let index = 0; index < count; index += 1) {
    clock.seconds += FRAME_S
    frame?.(clock.seconds)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  viewport.scrollY = 0
})

afterEach(() => {
  cleanup()
  document.documentElement.style.overflowY = ""
  document.body.style.overflowY = ""
})

describe("SmoothScroll press with the real Lenis", () => {
  it("stops a wheel glide where the page is", () => {
    const lenis = renderWithLenis()
    fireEvent.wheel(screen.getByText("content"), { deltaY: WHEEL_DELTA_PX })
    runFrames(FRAMES_INTO_THE_SCROLL)
    const pressedAt = lenis.scroll

    fireEvent.pointerDown(screen.getByText("content"))
    runFrames(FRAMES_TO_SETTLE)

    expect(pressedAt).toBeGreaterThan(0)
    expect(pressedAt).toBeLessThan(WHEEL_DELTA_PX)
    expect(lenis.scroll).toBe(pressedAt)
    expect(lenis.isScrolling).toBe(false)
  })

  it("lets a scripted section scroll reach its section", () => {
    const lenis = renderWithLenis()
    lenis.scrollTo(SECTION_TOP_PX, { duration: SECTION_SCROLL_DURATION_S })
    runFrames(FRAMES_INTO_THE_SCROLL)
    const pressedAt = lenis.scroll

    fireEvent.pointerDown(screen.getByText("content"))
    runFrames(FRAMES_TO_SETTLE)

    expect(pressedAt).toBeGreaterThan(0)
    expect(pressedAt).toBeLessThan(SECTION_TOP_PX)
    expect(lenis.scroll).toBe(SECTION_TOP_PX)
  })
})

describe("SmoothScroll with the page scroll-locked by an open popup", () => {
  it.each([
    { element: "body", lockedElement: () => document.body },
    { element: "root element", lockedElement: () => document.documentElement },
  ])("leaves the wheel to the browser while the $element is locked", ({ lockedElement }) => {
    const lenis = renderWithLenis()
    lockedElement().style.overflowY = "hidden"

    const leftToTheBrowser = fireEvent.wheel(screen.getByText("content"), { deltaY: WHEEL_DELTA_PX })
    runFrames(FRAMES_TO_SETTLE)

    expect(leftToTheBrowser).toBe(true)
    expect(lenis.targetScroll).toBe(0)
    expect(viewport.scrollY).toBe(0)
  })

  it("takes the wheel again once the lock is lifted", () => {
    const lenis = renderWithLenis()
    document.body.style.overflowY = "hidden"
    fireEvent.wheel(screen.getByText("content"), { deltaY: WHEEL_DELTA_PX })
    document.body.style.overflowY = ""

    const leftToTheBrowser = fireEvent.wheel(screen.getByText("content"), { deltaY: WHEEL_DELTA_PX })
    runFrames(FRAMES_TO_SETTLE)

    expect(leftToTheBrowser).toBe(false)
    expect(lenis.targetScroll).toBe(WHEEL_DELTA_PX)
    expect(viewport.scrollY).toBe(WHEEL_DELTA_PX)
  })
})
