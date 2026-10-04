import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getLenisInstance } from "~/src/integrations/lenis/lenis.instance"

interface ScrollerProxyConfig {
  getBoundingClientRect: () => { height: number; left: number; top: number; width: number }
  pinType: string
  scrollTop: (value?: number) => number
}

interface FakeLenis {
  readonly destroy: ReturnType<typeof vi.fn>
  isScrolling: false | "native" | "smooth"
  readonly listeners: Map<string, () => void>
  readonly on: (event: string, listener: () => void) => void
  readonly options: Record<string, unknown>
  readonly raf: ReturnType<typeof vi.fn>
  readonly resize: ReturnType<typeof vi.fn>
  readonly scroll: number
  readonly scrollTo: ReturnType<typeof vi.fn>
  targetScroll: number
}

const { FakeLenisStub, lenisInstances, scrollTrigger, ticker, useLenisRouterScrollSync } = vi.hoisted(() => {
  const instances: FakeLenis[] = []

  class LenisStub {
    public readonly destroy = vi.fn()

    public isScrolling: false | "native" | "smooth" = false

    public readonly listeners = new Map<string, () => void>()

    public readonly options: Record<string, unknown>

    public readonly raf = vi.fn()

    public readonly resize = vi.fn()

    public readonly scroll = 420

    public readonly scrollTo = vi.fn()

    public targetScroll = 420

    public constructor(options: Record<string, unknown>) {
      this.options = options
      instances.push(this)
    }

    public on(event: string, listener: () => void): void {
      this.listeners.set(event, listener)
    }
  }

  return {
    FakeLenisStub: LenisStub,
    lenisInstances: instances,
    scrollTrigger: {
      addEventListener: vi.fn<(event: string, listener: () => void) => void>(),
      refresh: vi.fn(),
      removeEventListener: vi.fn<(event: string, listener: () => void) => void>(),
      scrollerProxy: vi.fn<(element: unknown, config: Partial<ScrollerProxyConfig>) => void>(),
      update: vi.fn(),
    },
    ticker: {
      add: vi.fn<(callback: (time: number) => void) => void>(),
      lagSmoothing: vi.fn<(threshold: number) => void>(),
      remove: vi.fn<(callback: (time: number) => void) => void>(),
    },
    useLenisRouterScrollSync: vi.fn(),
  }
})

vi.mock("lenis", () => ({ default: FakeLenisStub }))
vi.mock("~/src/integrations/gsap/gsap.config", () => ({
  ScrollTrigger: scrollTrigger,
  gsap: {
    delayedCall: vi.fn((_delay: number, callback: () => void) => {
      callback()
    }),
    registerPlugin: vi.fn(),
    ticker,
  },
}))
vi.mock("~/src/hooks/use-lenis-router-scroll-sync", () => ({ useLenisRouterScrollSync }))

import { SmoothScroll } from "~/src/presentation/components/custom/smooth-scroll"

const lenis = (): FakeLenis => {
  const instance = lenisInstances.at(-1)
  if (instance === undefined) {
    throw new Error("SmoothScroll never created a Lenis instance")
  }

  return instance
}

const WHEEL_TARGET = 480

const startWheelGlide = (instance: FakeLenis): void => {
  instance.isScrolling = "smooth"
  instance.targetScroll = WHEEL_TARGET
}

const proxyConfig = (): Partial<ScrollerProxyConfig> => {
  const config = scrollTrigger.scrollerProxy.mock.calls[0]?.[1]
  if (config === undefined) {
    throw new Error("SmoothScroll never installed a ScrollTrigger scroller proxy")
  }

  return config
}

beforeEach(() => {
  vi.clearAllMocks()
  lenisInstances.length = 0
})

afterEach(() => {
  cleanup()
})

describe("SmoothScroll mounting", () => {
  it("renders its children untouched", () => {
    render(
      <SmoothScroll>
        <p>Storefront</p>
      </SmoothScroll>,
    )

    expect(screen.getByText("Storefront")).toBeInTheDocument()
  })

  it("keeps the router scroll sync wired up", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(useLenisRouterScrollSync).toHaveBeenCalled()
  })

  it("starts Lenis without its own animation frame loop", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(lenis().options).toStrictEqual({ autoRaf: false, lerp: 0.09, touchMultiplier: 2, wheelMultiplier: 1 })
  })

  it("publishes the instance so the rest of the app can drive it", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(getLenisInstance()).toBe(lenis())
  })
})

describe("SmoothScroll ScrollTrigger bridge", () => {
  it("proxies the document element and pins with a transform", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(scrollTrigger.scrollerProxy.mock.calls[0]?.[0]).toBe(document.documentElement)
    expect(proxyConfig().pinType).toBe("transform")
  })

  it("reports the viewport rectangle from the window", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(proxyConfig().getBoundingClientRect?.()).toStrictEqual({
      height: window.innerHeight,
      left: 0,
      top: 0,
      width: document.documentElement.clientWidth,
    })
  })

  it("reads the current Lenis offset when ScrollTrigger asks for the position", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(proxyConfig().scrollTop?.()).toBe(420)
    expect(lenis().scrollTo).not.toHaveBeenCalled()
  })

  it("jumps Lenis straight to the position ScrollTrigger sets", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    proxyConfig().scrollTop?.(900)

    expect(lenis().scrollTo).toHaveBeenCalledWith(900, { immediate: true })
  })

  it("pushes every Lenis scroll into ScrollTrigger", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    lenis().listeners.get("scroll")?.()

    expect(scrollTrigger.update).toHaveBeenCalledTimes(1)
  })

  it("re-measures Lenis whenever ScrollTrigger refreshes", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    const [event, listener] = scrollTrigger.addEventListener.mock.calls[0] ?? []

    expect(event).toBe("refresh")
    listener?.()

    expect(lenis().resize).toHaveBeenCalledTimes(1)
  })

  it("refreshes ScrollTrigger once the first frame has been scheduled", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(scrollTrigger.refresh).toHaveBeenCalledTimes(1)
  })
})

describe("SmoothScroll frame loop", () => {
  it("drives Lenis from the gsap ticker in milliseconds", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    const raf = ticker.add.mock.calls[0]?.[0]
    raf?.(1.5)

    expect(lenis().raf).toHaveBeenCalledWith(1500)
  })

  it("turns off lag smoothing so the ticker never skips", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    expect(ticker.lagSmoothing).toHaveBeenCalledWith(0)
  })
})

describe("SmoothScroll press during a wheel glide", () => {
  it("stops the glide where the page is, so the press and the release land on the same control", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    startWheelGlide(lenis())

    fireEvent.pointerDown(screen.getByText("content"))

    expect(lenis().scrollTo).toHaveBeenCalledWith(420, { force: true, immediate: true })
  })

  it("stops the glide even when the pressed control keeps the press to itself", () => {
    render(
      <SmoothScroll>
        <button type="button">Cancel</button>
      </SmoothScroll>,
    )
    const cancel = screen.getByRole("button", { name: "Cancel" })
    cancel.addEventListener("pointerdown", (event) => {
      event.stopPropagation()
    })
    startWheelGlide(lenis())

    fireEvent.pointerDown(cancel)

    expect(lenis().scrollTo).toHaveBeenCalledWith(420, { force: true, immediate: true })
  })

  it("leaves a page at rest alone", () => {
    render(<SmoothScroll>content</SmoothScroll>)

    fireEvent.pointerDown(screen.getByText("content"))

    expect(lenis().scrollTo).not.toHaveBeenCalled()
  })

  it("lets a scripted scroll run on, since Lenis only keeps a wheel target ahead of the page", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    lenis().isScrolling = "smooth"

    fireEvent.pointerDown(screen.getByText("content"))

    expect(lenis().scrollTo).not.toHaveBeenCalled()
  })

  it("leaves native scrolling to the browser", () => {
    render(<SmoothScroll>content</SmoothScroll>)
    lenis().isScrolling = "native"

    fireEvent.pointerDown(screen.getByText("content"))

    expect(lenis().scrollTo).not.toHaveBeenCalled()
  })
})

describe("SmoothScroll teardown", () => {
  it("takes the frame callback off the ticker", () => {
    const { unmount } = render(<SmoothScroll>content</SmoothScroll>)
    const raf = ticker.add.mock.calls[0]?.[0]
    unmount()

    expect(ticker.remove).toHaveBeenCalledWith(raf)
  })

  it("removes the refresh listener it added", () => {
    const { unmount } = render(<SmoothScroll>content</SmoothScroll>)
    const listener = scrollTrigger.addEventListener.mock.calls[0]?.[1]
    unmount()

    expect(scrollTrigger.removeEventListener).toHaveBeenCalledWith("refresh", listener)
  })

  it("clears the scroller proxy so ScrollTrigger falls back to the window", () => {
    const { unmount } = render(<SmoothScroll>content</SmoothScroll>)
    unmount()

    expect(scrollTrigger.scrollerProxy).toHaveBeenCalledTimes(2)
    expect(scrollTrigger.scrollerProxy.mock.calls[1]).toStrictEqual([document.documentElement, {}])
  })

  it("stops watching presses", () => {
    const { unmount } = render(<SmoothScroll>content</SmoothScroll>)
    const instance = lenis()
    unmount()
    startWheelGlide(instance)

    fireEvent.pointerDown(document.body)

    expect(instance.scrollTo).not.toHaveBeenCalled()
  })

  it("destroys Lenis and withdraws the shared instance", () => {
    const { unmount } = render(<SmoothScroll>content</SmoothScroll>)
    const instance = lenis()
    unmount()

    expect(instance.destroy).toHaveBeenCalledTimes(1)
    expect(getLenisInstance()).toBeUndefined()
  })
})
