import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type Lenis from "lenis"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ScrollTrigger } from "~/src/integrations/gsap/gsap.config"
import { getLenisInstance } from "~/src/integrations/lenis/lenis.instance"

vi.mock("~/src/hooks/use-lenis-router-scroll-sync", () => ({ useLenisRouterScrollSync: vi.fn() }))

import { SmoothScroll } from "~/src/presentation/components/custom/smooth-scroll"

const PAGE_HEIGHT_PX = 4000

const WHEEL_DELTA_PX = 300

const FRAME_MS = 1000 / 60

const FRAMES_INTO_THE_SCROLL = 5

const FRAMES_TO_SETTLE = 90

const viewport = { scrollY: 0 }

vi.stubGlobal("Window", { [Symbol.hasInstance]: (candidate: unknown) => candidate === globalThis })
Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: PAGE_HEIGHT_PX })
Object.defineProperty(globalThis, "scrollY", { configurable: true, get: () => viewport.scrollY })
Object.defineProperty(globalThis, "pageYOffset", { configurable: true, get: () => viewport.scrollY })
vi.stubGlobal("scrollTo", (...position: [number, number] | [Readonly<{ top: number }>]) => {
  viewport.scrollY = position.length === 2 ? position[1] : position[0].top
})

const clock = { ms: 1000 }

const lenis = (): Lenis => {
  const instance = getLenisInstance()
  if (instance === undefined) {
    throw new Error("SmoothScroll never published its Lenis instance")
  }

  return instance
}

const runFrames = (count: number): void => {
  for (let index = 0; index < count; index += 1) {
    clock.ms += FRAME_MS
    lenis().raf(clock.ms)
  }
}

const watchThePage = (): void => {
  ScrollTrigger.create({ end: PAGE_HEIGHT_PX, start: 0 })
}

beforeEach(() => {
  viewport.scrollY = 0
})

afterEach(() => {
  cleanup()
  for (const trigger of ScrollTrigger.getAll()) {
    trigger.kill()
  }
})

describe("SmoothScroll with the real ScrollTrigger and Lenis", () => {
  it("keeps a wheel glide going through a ScrollTrigger refresh", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    watchThePage()
    runFrames(1)
    fireEvent.wheel(screen.getByText("content"), { deltaY: WHEEL_DELTA_PX })
    runFrames(FRAMES_INTO_THE_SCROLL)
    const refreshedAt = viewport.scrollY

    ScrollTrigger.refresh()
    runFrames(FRAMES_TO_SETTLE)

    expect(refreshedAt).toBeGreaterThan(0)
    expect(refreshedAt).toBeLessThan(WHEEL_DELTA_PX)
    expect(lenis().targetScroll).toBe(WHEEL_DELTA_PX)
    expect(viewport.scrollY).toBe(WHEEL_DELTA_PX)
  })
})
