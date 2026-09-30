import Lenis from "lenis"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getLenisInstance, setLenisInstance, syncLenisToWindowScroll } from "~/src/integrations/lenis/lenis.instance"

const createLenis = (): Lenis => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )

  return new Lenis({ autoRaf: false })
}

beforeEach(() => {
  setLenisInstance(undefined)
})

afterEach(() => {
  setLenisInstance(undefined)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("the shared Lenis handle", () => {
  it("is empty until a scroll provider registers one", () => {
    expect(getLenisInstance()).toBeUndefined()
  })

  it("hands back the very instance that was registered", () => {
    const lenis = createLenis()
    setLenisInstance(lenis)

    expect(getLenisInstance()).toBe(lenis)
  })

  it("forgets the instance when the provider unmounts", () => {
    setLenisInstance(createLenis())
    setLenisInstance(undefined)

    expect(getLenisInstance()).toBeUndefined()
  })

  it("replaces an earlier instance rather than keeping both", () => {
    const first = createLenis()
    const second = createLenis()
    setLenisInstance(first)
    setLenisInstance(second)

    expect(getLenisInstance()).toBe(second)
  })
})

describe("syncLenisToWindowScroll", () => {
  it("does nothing when no instance is registered", () => {
    expect(() => {
      syncLenisToWindowScroll()
    }).not.toThrow()
  })

  it("jumps the instance to the page scroll position and remeasures", () => {
    const lenis = createLenis()
    const scrollTo = vi.spyOn(lenis, "scrollTo").mockImplementation(() => {})
    const resize = vi.spyOn(lenis, "resize").mockImplementation(() => {})
    vi.spyOn(globalThis, "scrollY", "get").mockReturnValue(420)
    setLenisInstance(lenis)

    syncLenisToWindowScroll()

    expect(scrollTo).toHaveBeenCalledWith(420, { force: true, immediate: true })
    expect(resize).toHaveBeenCalledTimes(1)
  })

  it("syncs to the top of the document when the page is not scrolled", () => {
    const lenis = createLenis()
    const scrollTo = vi.spyOn(lenis, "scrollTo").mockImplementation(() => {})
    vi.spyOn(lenis, "resize").mockImplementation(() => {})
    setLenisInstance(lenis)

    syncLenisToWindowScroll()

    expect(scrollTo).toHaveBeenCalledWith(0, { force: true, immediate: true })
  })
})
