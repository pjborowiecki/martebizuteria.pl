import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const media = vi.hoisted(() => ({ active: ["(prefers-reduced-motion: no-preference)"] }))

interface BatchConfig {
  readonly onEnter: (batch: readonly Element[]) => void
  readonly once: boolean
  readonly start: string
}

const gsapMock = vi.hoisted(() => ({
  batch: vi.fn((targets: readonly Element[], config: BatchConfig) => ({ config, targets })),
  fromTo: vi.fn(),
  set: vi.fn(),
  to: vi.fn(),
}))

vi.mock("~/src/integrations/gsap/gsap.config", () => ({
  ScrollTrigger: { batch: gsapMock.batch },
  gsap: {
    fromTo: gsapMock.fromTo,
    matchMedia: () => ({
      add: (query: string, run: () => void) => {
        if (media.active.includes(query)) {
          run()
        }
      },
    }),
    set: gsapMock.set,
    to: gsapMock.to,
    utils: { toArray: (selector: string, root: HTMLElement) => [...root.querySelectorAll(selector)] },
  },
  useGSAP: (callback: () => void) => {
    callback()
  },
}))

const { useProductAnimations } = await import("~/src/presentation/components/custom/pages/product-page/hooks/use-product-animations")

const buildRoot = ({ parallaxWraps = 0, reveals = 0, wrapsWithoutImage = 0 } = {}): HTMLElement => {
  const revealMarkup = '<section class="reveal"></section>'.repeat(reveals)
  const wrapMarkup = '<figure class="parallax-wrap"><img class="parallax-img" alt=""></figure>'.repeat(parallaxWraps)
  const emptyWrapMarkup = '<figure class="parallax-wrap"></figure>'.repeat(wrapsWithoutImage)

  document.body.innerHTML = `<div id="product-root">${revealMarkup}${wrapMarkup}${emptyWrapMarkup}</div>`
  const root = document.body.querySelector<HTMLElement>("#product-root")
  if (root === null) {
    throw new Error("expected the product page root to be built")
  }

  return root
}

const putInView = (element: Element): void => {
  element.getBoundingClientRect = () => new DOMRect(0, 10, 100, 100)
}

describe("useProductAnimations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    media.active = ["(prefers-reduced-motion: no-preference)"]
    document.body.innerHTML = ""
  })

  afterEach(() => {
    cleanup()
  })

  it("does nothing until the page root is mounted", () => {
    renderHook(() => {
      useProductAnimations({ rootRef: { current: null } })
    })

    expect(gsapMock.set).not.toHaveBeenCalled()
    expect(gsapMock.batch).not.toHaveBeenCalled()
  })

  it("hides the reveal sections and batches them behind a scroll trigger", () => {
    const root = buildRoot({ reveals: 3 })

    renderHook(() => {
      useProductAnimations({ rootRef: { current: root } })
    })

    expect(gsapMock.set).toHaveBeenCalledTimes(1)
    expect(gsapMock.set.mock.calls[0]?.[1]).toStrictEqual({ autoAlpha: 0, y: 24 })
    expect(gsapMock.batch).toHaveBeenCalledTimes(1)
    expect(gsapMock.batch.mock.calls[0]?.[1]).toMatchObject({ once: true, start: "top 92%" })
  })

  it("skips the reveal setup when the page has nothing to reveal", () => {
    const root = buildRoot({ parallaxWraps: 1 })

    renderHook(() => {
      useProductAnimations({ rootRef: { current: root } })
    })

    expect(gsapMock.set).not.toHaveBeenCalled()
    expect(gsapMock.batch).not.toHaveBeenCalled()
  })

  it("reveals the sections already on screen straight away with a stagger", () => {
    const root = buildRoot({ reveals: 2 })
    for (const reveal of root.querySelectorAll(".reveal")) {
      putInView(reveal)
    }

    renderHook(() => {
      useProductAnimations({ rootRef: { current: root } })
    })

    expect(gsapMock.to).toHaveBeenCalledTimes(1)
    expect(gsapMock.to.mock.calls[0]?.[1]).toMatchObject({ autoAlpha: 1, stagger: 0.08, y: 0 })
  })

  it("leaves sections below the fold to the scroll trigger", () => {
    const root = buildRoot({ reveals: 2 })

    renderHook(() => {
      useProductAnimations({ rootRef: { current: root } })
    })

    expect(gsapMock.to).not.toHaveBeenCalled()
  })

  it("reveals a batch with a stagger once it scrolls into view", () => {
    const root = buildRoot({ reveals: 2 })

    renderHook(() => {
      useProductAnimations({ rootRef: { current: root } })
    })

    const config = gsapMock.batch.mock.calls[0]?.[1]
    if (config === undefined) {
      throw new Error("expected the reveal sections to be batched")
    }
    const batched = [...root.querySelectorAll(".reveal")]
    config.onEnter(batched)

    expect(gsapMock.to).toHaveBeenCalledTimes(1)
    expect(gsapMock.to.mock.calls[0]?.[0]).toStrictEqual(batched)
  })

  it("parallaxes every wrap that carries an image", () => {
    const root = buildRoot({ parallaxWraps: 2, reveals: 1, wrapsWithoutImage: 1 })

    renderHook(() => {
      useProductAnimations({ rootRef: { current: root } })
    })

    expect(gsapMock.fromTo).toHaveBeenCalledTimes(2)
    expect(gsapMock.fromTo.mock.calls[0]?.[1]).toStrictEqual({ yPercent: -4 })
    expect(gsapMock.fromTo.mock.calls[0]?.[2]).toMatchObject({ yPercent: 4 })
  })

  it("shows the reveal sections without animating when motion is reduced", () => {
    media.active = ["(prefers-reduced-motion: reduce)"]
    const root = buildRoot({ parallaxWraps: 1, reveals: 2 })

    renderHook(() => {
      useProductAnimations({ rootRef: { current: root } })
    })

    expect(gsapMock.set).toHaveBeenCalledTimes(1)
    expect(gsapMock.set.mock.calls[0]?.[1]).toStrictEqual({ autoAlpha: 1, y: 0 })
    expect(gsapMock.batch).not.toHaveBeenCalled()
    expect(gsapMock.fromTo).not.toHaveBeenCalled()
  })
})
