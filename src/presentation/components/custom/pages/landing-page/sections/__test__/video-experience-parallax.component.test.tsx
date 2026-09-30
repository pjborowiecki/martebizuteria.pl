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
  queries: [] as string[],
  setup: undefined as (() => void) | undefined,
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
      matchMedia: () => ({
        add: (query: string, callback: () => void) => {
          captured.queries.push(query)
          if (control.runMediaCallbacks) {
            callback()
          }
        },
      }),
      to: (target: unknown, vars: AnimationVars) => {
        captured.targets.push(target)
        captured.vars.push(vars)

        return { kill: vi.fn() }
      },
    },
    useGSAP: (callback: () => void) => {
      captured.setup = callback
      useLayoutEffect(() => {
        callback()
      }, [callback])
    },
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { VideoExperienceSection } from "~/src/presentation/components/custom/pages/landing-page/sections/video-experience-section"

const scrollVars = () => {
  const [vars] = captured.vars
  if (vars === undefined) {
    throw new Error("the parallax animation was never created")
  }

  return vars
}

beforeEach(() => {
  captured.queries.length = 0
  captured.setup = undefined
  captured.targets.length = 0
  captured.vars.length = 0
  control.runMediaCallbacks = true
})

afterEach(() => {
  cleanup()
})

describe("video experience parallax", () => {
  it("ignores animation setup after its section has unmounted", () => {
    const { unmount } = renderWithProviders(<VideoExperienceSection />)
    const { setup } = captured
    unmount()
    captured.queries.length = 0
    captured.targets.length = 0

    setup?.()

    expect(captured.queries).toStrictEqual([])
    expect(captured.targets).toStrictEqual([])
  })

  it("runs only for shoppers who accept motion", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(captured.queries).toStrictEqual(["(prefers-reduced-motion: no-preference)"])
  })

  it("parallaxes the section itself", () => {
    const { container } = renderWithProviders(<VideoExperienceSection />)

    expect(captured.targets[0]).toBe(container.querySelector("section"))
  })

  it("drifts the section a quarter of its height without easing", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(scrollVars().yPercent).toBe(25)
    expect(scrollVars().ease).toBe("none")
  })

  it("scrubs the drift across the section's own scroll span", () => {
    const { container } = renderWithProviders(<VideoExperienceSection />)
    const { scrollTrigger } = scrollVars()

    expect(scrollTrigger?.start).toBe("top top")
    expect(scrollTrigger?.end).toBe("bottom top")
    expect(scrollTrigger?.scrub).toBe(true)
    expect(scrollTrigger?.trigger).toBe(container.querySelector("section"))
  })

  it("registers the media query but animates nothing until it matches", () => {
    control.runMediaCallbacks = false

    renderWithProviders(<VideoExperienceSection />)

    expect(captured.queries).toHaveLength(1)
    expect(captured.vars).toStrictEqual([])
  })

  it("still renders the section copy alongside the animation", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument()
  })
})
