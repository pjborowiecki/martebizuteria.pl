import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { listenForStaleChunks } from "~/src/lib/stale-chunk"

const NOW = Date.UTC(2026, 9, 17, 12)

const browser = vi.hoisted(() => ({
  listeners: new Map<string, () => void>(),
  reload: vi.fn<() => void>(),
  stored: new Map<string, string>(),
}))

const fire = (type: string): void => {
  browser.listeners.get(type)?.()
}

beforeEach(() => {
  browser.listeners.clear()
  browser.reload.mockReset()
  browser.stored.clear()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  vi.stubGlobal("addEventListener", (type: string, listener: () => void) => browser.listeners.set(type, listener))
  vi.stubGlobal("location", { reload: browser.reload })
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => browser.stored.get(key) ?? null,
    setItem: (key: string, value: string) => browser.stored.set(key, value),
  })
  listenForStaleChunks()
  fire("pageshow")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("listenForStaleChunks", () => {
  it("listens for the event Vite fires when a code chunk fails to load, and for the page being left or shown", () => {
    expect([...browser.listeners.keys()].toSorted()).toStrictEqual(["beforeunload", "pagehide", "pageshow", "vite:preloadError"])
  })

  it("reloads the page once, so a tab opened before a deploy fetches the chunks the new deploy serves", () => {
    fire("vite:preloadError")

    expect(browser.reload).toHaveBeenCalledOnce()
    expect(browser.stored.get("marte-stale-chunk-reloaded-at")).toBe(String(NOW))
  })

  it("does not reload again while the reload it just made is recent, so a chunk that is really missing cannot loop", () => {
    fire("vite:preloadError")
    vi.setSystemTime(NOW + 9999)
    fire("vite:preloadError")

    expect(browser.reload).toHaveBeenCalledOnce()
  })

  it("reloads again for a later deploy once the earlier reload is ten seconds old", () => {
    fire("vite:preloadError")
    vi.setSystemTime(NOW + 10_000)
    fire("vite:preloadError")

    expect(browser.reload).toHaveBeenCalledTimes(2)
  })

  it.each(["beforeunload", "pagehide"])(
    "leaves a navigation away alone, whose aborted imports a browser also reports, after %s",
    (leaving) => {
      fire(leaving)
      fire("vite:preloadError")

      expect(browser.reload).not.toHaveBeenCalled()
    },
  )

  it("reloads again for a page the browser brings back from its back-forward cache", () => {
    fire("pagehide")
    fire("pageshow")
    fire("vite:preloadError")

    expect(browser.reload).toHaveBeenCalledOnce()
  })
})
