import { type JSX, type ReactNode, useEffect, useRef } from "react"

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface BatchConfig {
  readonly onEnter?: (batch: Element[]) => void
  readonly once?: boolean
  readonly start?: string
}

const gsapStub = vi.hoisted(() => {
  const media = {
    entries: [] as { query: string; handler: () => void }[],
    reverts: 0,
  }

  return {
    batchCalls: [] as { config: BatchConfig; targets: unknown }[],
    delayedCalls: [] as (() => void)[],
    fromToCalls: [] as { from: Record<string, unknown>; target: unknown; to: Record<string, unknown> }[],
    media,
    refreshCount: { value: 0 },
    setCalls: [] as { target: unknown; vars: Record<string, unknown> }[],
    toCalls: [] as { target: unknown; vars: Record<string, unknown> }[],
  }
})

vi.mock("~/src/integrations/gsap/gsap.config", () => ({
  ScrollTrigger: {
    batch: (targets: unknown, config: BatchConfig) => {
      gsapStub.batchCalls.push({ config, targets })
    },
    refresh: () => {
      gsapStub.refreshCount.value += 1
    },
  },
  gsap: {
    delayedCall: (_delay: number, callback: () => void) => {
      gsapStub.delayedCalls.push(callback)
    },
    fromTo: (target: unknown, from: Record<string, unknown>, to: Record<string, unknown>) => {
      gsapStub.fromToCalls.push({ from, target, to })
    },
    matchMedia: () => ({
      add: (query: string, handler: () => void) => {
        gsapStub.media.entries.push({ handler, query })
        if (globalThis.matchMedia(query).matches) {
          handler()
        }
      },
      revert: () => {
        gsapStub.media.reverts += 1
      },
    }),
    set: (target: unknown, vars: Record<string, unknown>) => {
      gsapStub.setCalls.push({ target, vars })
    },
    to: (target: unknown, vars: Record<string, unknown>) => {
      gsapStub.toCalls.push({ target, vars })
    },
    utils: {
      toArray: (selector: string, scope: HTMLElement) => [...scope.querySelectorAll(selector)],
    },
  },
  useGSAP: (callback: () => (() => void) | undefined) => {
    useEffect(callback, [callback])
  },
}))

const { useLandingAnimations } = await import("~/src/hooks/use-landing-animations")

const IN_VIEW_RECT = { bottom: 200, top: 100 }

const OUT_OF_VIEW_RECT = { bottom: 1000, top: 900 }

const rectFor = (element: Element): DOMRect => {
  const { bottom, top } = element.classList.contains("out-of-view") ? OUT_OF_VIEW_RECT : IN_VIEW_RECT

  return {
    bottom,
    height: bottom - top,
    left: 0,
    right: 100,
    toJSON: () => ({}),
    top,
    width: 100,
    x: 0,
    y: top,
  }
}

const Harness = ({ children }: Readonly<{ children?: ReactNode }>): JSX.Element => {
  const rootRef = useRef<HTMLDivElement>(null)
  useLandingAnimations({ rootRef })

  return <div ref={rootRef}>{children}</div>
}

const DetachedHarness = (): JSX.Element => {
  const rootRef = useRef<HTMLDivElement>(null)
  useLandingAnimations({ rootRef })

  return <section />
}

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

const stubMatchMedia = (matching: string): void => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: query === matching,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  }))
}

const setVarsFor = (className: string): Record<string, unknown>[] =>
  gsapStub.setCalls
    .filter((call) => (Array.isArray(call.target) ? call.target : [call.target]).some((target) => isElementWithClass(target, className)))
    .map((call) => call.vars)

const isElementWithClass = (target: unknown, className: string): boolean =>
  target instanceof Element && target.classList.contains(className)

beforeEach(() => {
  gsapStub.batchCalls.length = 0
  gsapStub.delayedCalls.length = 0
  gsapStub.fromToCalls.length = 0
  gsapStub.media.entries.length = 0
  gsapStub.media.reverts = 0
  gsapStub.refreshCount.value = 0
  gsapStub.setCalls.length = 0
  gsapStub.toCalls.length = 0
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function getRect(this: Element) {
    return rectFor(this)
  })
  stubMatchMedia(MOTION_QUERY)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("useLandingAnimations media queries", () => {
  it("registers one branch for motion and one for reduced motion", () => {
    render(<Harness />)

    expect(gsapStub.media.entries.map((entry) => entry.query)).toStrictEqual([MOTION_QUERY, REDUCED_MOTION_QUERY])
  })

  it("does nothing at all while the root element is not mounted", () => {
    render(<DetachedHarness />)

    expect(gsapStub.media.entries).toHaveLength(0)
    expect(gsapStub.setCalls).toHaveLength(0)
  })

  it("reverts the registered media branches when the section unmounts", () => {
    const view = render(<Harness />)
    view.unmount()

    expect(gsapStub.media.reverts).toBe(1)
  })
})

describe("useLandingAnimations reveals", () => {
  it("hides every reveal before it scrolls into view", () => {
    render(
      <Harness>
        <p className="reveal out-of-view">Hidden until scrolled to</p>
      </Harness>,
    )

    expect(setVarsFor("reveal")).toStrictEqual([{ autoAlpha: 0, y: 28 }])
  })

  it("reveals the elements already on screen straight away, staggered", () => {
    render(
      <Harness>
        <p className="reveal">On screen</p>
      </Harness>,
    )

    expect(gsapStub.toCalls).toStrictEqual([
      {
        target: [document.querySelector(".reveal")],
        vars: { autoAlpha: 1, duration: 0.9, ease: "power2.out", overwrite: true, stagger: 0.08, y: 0 },
      },
    ])
  })

  it("leaves the off screen reveals to the scroll trigger batch", () => {
    render(
      <Harness>
        <p className="reveal out-of-view">Off screen</p>
      </Harness>,
    )

    expect(gsapStub.toCalls).toHaveLength(0)
    expect(gsapStub.batchCalls[0]?.config.once).toBe(true)
    expect(gsapStub.batchCalls[0]?.config.start).toBe("top 92%")
    expect(gsapStub.batchCalls[0]?.config.onEnter).toBeTypeOf("function")
  })

  it("reveals a batch when it enters, keeping only the html elements", () => {
    render(
      <Harness>
        <p className="reveal out-of-view">Off screen</p>
      </Harness>,
    )
    const paragraph = document.querySelector(".reveal")
    const svgShape = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    gsapStub.batchCalls[0]?.config.onEnter?.([paragraph, svgShape].filter((node): node is Element => node !== null))

    expect(gsapStub.toCalls).toHaveLength(1)
    expect(gsapStub.toCalls[0]?.target).toStrictEqual([paragraph])
  })

  it("skips the reveal setup entirely when the section has no reveals", () => {
    render(
      <Harness>
        <p className="plain">No animation</p>
      </Harness>,
    )

    expect(gsapStub.batchCalls).toHaveLength(0)
    expect(gsapStub.setCalls).toHaveLength(0)
  })

  it("refreshes the scroll triggers once the reveals are wired up", () => {
    render(
      <Harness>
        <p className="reveal out-of-view">Off screen</p>
      </Harness>,
    )

    expect(gsapStub.delayedCalls).toHaveLength(1)
    gsapStub.delayedCalls[0]?.()

    expect(gsapStub.refreshCount.value).toBe(1)
  })
})

describe("useLandingAnimations line reveals", () => {
  it("draws an on screen line immediately instead of on scroll", () => {
    render(
      <Harness>
        <span className="line-reveal" />
      </Harness>,
    )

    expect(setVarsFor("line-reveal")).toStrictEqual([{ scaleX: 1, transformOrigin: "left center" }])
    expect(gsapStub.fromToCalls).toHaveLength(0)
  })

  it("ties an off screen line to its own scroll trigger", () => {
    render(
      <Harness>
        <span className="line-reveal out-of-view" />
      </Harness>,
    )
    const line = document.querySelector(".line-reveal")

    expect(gsapStub.fromToCalls).toStrictEqual([
      {
        from: { scaleX: 0, transformOrigin: "left center" },
        target: line,
        to: {
          duration: 1,
          ease: "power2.out",
          scaleX: 1,
          scrollTrigger: { once: true, start: "top 92%", trigger: line },
        },
      },
    ])
  })
})

describe("useLandingAnimations parallax", () => {
  it("scrubs the image inside a parallax wrapper against the scroll position", () => {
    render(
      <Harness>
        <div className="parallax-wrap">
          <img alt="" className="parallax-img" src="/hero.avif" />
        </div>
      </Harness>,
    )
    const wrap = document.querySelector(".parallax-wrap")
    const image = document.querySelector(".parallax-img")

    expect(gsapStub.fromToCalls).toStrictEqual([
      {
        from: { yPercent: -6 },
        target: image,
        to: {
          ease: "none",
          scrollTrigger: { end: "bottom top", scrub: true, start: "top bottom", trigger: wrap },
          yPercent: 6,
        },
      },
    ])
  })

  it("leaves a parallax wrapper without an image alone", () => {
    render(
      <Harness>
        <div className="parallax-wrap" />
      </Harness>,
    )

    expect(gsapStub.fromToCalls).toHaveLength(0)
  })
})

describe("useLandingAnimations reduced motion", () => {
  beforeEach(() => {
    stubMatchMedia(REDUCED_MOTION_QUERY)
  })

  it("shows the reveals and the lines without animating them", () => {
    render(
      <Harness>
        <p className="reveal">Copy</p>
        <span className="line-reveal" />
      </Harness>,
    )

    expect(gsapStub.setCalls).toStrictEqual([
      {
        target: [document.querySelector(".reveal"), document.querySelector(".line-reveal")],
        vars: { autoAlpha: 1, clearProps: "transform" },
      },
    ])
  })

  it("wires up no scroll triggers at all", () => {
    render(
      <Harness>
        <p className="reveal">Copy</p>
        <div className="parallax-wrap">
          <img alt="" className="parallax-img" src="/hero.avif" />
        </div>
      </Harness>,
    )

    expect(gsapStub.batchCalls).toHaveLength(0)
    expect(gsapStub.fromToCalls).toHaveLength(0)
    expect(gsapStub.delayedCalls).toHaveLength(0)
  })
})
