import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface ScrollTriggerConfig {
  readonly end?: string
  readonly scrub?: boolean
  readonly start?: string
  readonly trigger?: unknown
}

interface AnimationVars {
  readonly ease?: string
  readonly scrollTrigger?: ScrollTriggerConfig
  readonly yPercent?: number
}

const captured = vi.hoisted(() => ({
  callbacks: [] as (() => void)[],
  queries: [] as string[],
  targets: [] as unknown[],
  vars: [] as AnimationVars[],
}))

const control = vi.hoisted(() => ({ runMediaCallbacks: true }))

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/integrations/gsap/gsap.config", async () => {
  const { useLayoutEffect } = await import("react")

  return {
    ScrollTrigger: { refresh: vi.fn() },
    gsap: {
      from: (target: unknown, vars: AnimationVars) => {
        captured.targets.push(target)
        captured.vars.push(vars)

        return { kill: vi.fn() }
      },
      matchMedia: () => ({
        add: (query: string, callback: () => void) => {
          captured.queries.push(query)
          if (control.runMediaCallbacks) {
            callback()
          }
        },
      }),
    },
    useGSAP: (callback: () => void) => {
      captured.callbacks.push(callback)
      useLayoutEffect(() => {
        callback()
      }, [callback])
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ValuesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/values-section"

const scrollVars = (): AnimationVars => {
  const [vars] = captured.vars
  if (vars === undefined) {
    throw new Error("the parallax animation was never created")
  }

  return vars
}

const replayAnimationSetup = (): void => {
  const callback = captured.callbacks.at(-1)
  if (callback === undefined) {
    throw new Error("the section never registered an animation")
  }
  callback()
}

beforeEach(() => {
  captured.callbacks.length = 0
  captured.queries.length = 0
  captured.targets.length = 0
  captured.vars.length = 0
  control.runMediaCallbacks = true
})

afterEach(() => {
  cleanup()
})

describe("values section parallax", () => {
  it("runs only for shoppers who accept motion", () => {
    renderWithProviders(<ValuesSection />)

    expect(captured.queries).toStrictEqual(["(prefers-reduced-motion: no-preference)"])
  })

  it("parallaxes the section itself", () => {
    const { container } = renderWithProviders(<ValuesSection />)

    expect(captured.targets).toStrictEqual([container.querySelector("section")])
  })

  it("drifts the section upwards without easing", () => {
    renderWithProviders(<ValuesSection />)

    expect(scrollVars().yPercent).toBe(-15)
    expect(scrollVars().ease).toBe("none")
  })

  it("scrubs the drift while the section travels into view", () => {
    const { container } = renderWithProviders(<ValuesSection />)
    const { scrollTrigger } = scrollVars()

    expect(scrollTrigger?.start).toBe("top bottom")
    expect(scrollTrigger?.end).toBe("top 60%")
    expect(scrollTrigger?.scrub).toBe(true)
    expect(scrollTrigger?.trigger).toBe(container.querySelector("section"))
  })

  it("registers the media query but animates nothing until it matches", () => {
    control.runMediaCallbacks = false

    renderWithProviders(<ValuesSection />)

    expect(captured.queries).toHaveLength(1)
    expect(captured.vars).toStrictEqual([])
  })

  it("animates nothing once the section has left the page", () => {
    renderWithProviders(<ValuesSection />)
    cleanup()
    captured.queries.length = 0
    captured.vars.length = 0

    replayAnimationSetup()

    expect(captured.queries).toStrictEqual([])
    expect(captured.vars).toStrictEqual([])
  })

  it("still renders the section copy alongside the animation", () => {
    renderWithProviders(<ValuesSection />)

    expect(screen.getByRole("heading", { level: 2, name: "Quality of the highest purity" })).toBeInTheDocument()
  })
})
