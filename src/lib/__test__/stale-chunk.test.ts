import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { listenForStaleChunks } from "~/src/lib/stale-chunk"

const NOW = Date.UTC(2026, 9, 17, 12)

const NOT_FOUND = 404

const OK = 200

const browser = vi.hoisted(() => ({
  checks: [] as { init: RequestInit | undefined; url: string }[],
  listeners: new Map<string, () => void>(),
  reload: vi.fn<() => void>(),
  served: { status: 404 },
  stored: new Map<string, string>(),
  unreachable: { value: false },
}))

const fire = (type: string): void => {
  browser.listeners.get(type)?.()
}

const settle = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

beforeEach(() => {
  browser.checks.length = 0
  browser.listeners.clear()
  browser.reload.mockReset()
  browser.served.status = NOT_FOUND
  browser.stored.clear()
  browser.unreachable.value = false
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  vi.stubGlobal("addEventListener", (type: string, listener: () => void) => browser.listeners.set(type, listener))
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    browser.checks.push({ init, url })

    return browser.unreachable.value
      ? Promise.reject(new TypeError("Load failed"))
      : Promise.resolve(new Response(undefined, { status: browser.served.status }))
  })
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

  it("asks the server, without its cache, whether it still serves this tab's own code", async () => {
    fire("vite:preloadError")
    await settle()

    expect(browser.checks).toStrictEqual([
      { init: { cache: "no-store", method: "HEAD" }, url: new URL("../stale-chunk.ts", import.meta.url).href },
    ])
  })

  it("reloads the page once when a deploy has replaced this tab's code, so it fetches the chunks the new deploy serves", async () => {
    fire("vite:preloadError")
    await settle()

    expect(browser.reload).toHaveBeenCalledOnce()
    expect(browser.stored.get("marte-stale-chunk-reloaded-at")).toBe(String(NOW))
  })

  it("leaves a failed import alone while the server still serves this tab's code, as when a navigation away aborts it", async () => {
    browser.served.status = OK

    fire("vite:preloadError")
    await settle()

    expect(browser.reload).not.toHaveBeenCalled()
  })

  it("leaves the page alone when the server cannot be asked", async () => {
    browser.unreachable.value = true

    fire("vite:preloadError")
    await settle()

    expect(browser.reload).not.toHaveBeenCalled()
  })

  it("does not reload again while the reload it just made is recent, so a chunk that is really missing cannot loop", async () => {
    fire("vite:preloadError")
    await settle()
    vi.setSystemTime(NOW + 9999)
    fire("vite:preloadError")
    await settle()

    expect(browser.reload).toHaveBeenCalledOnce()
  })

  it("reloads again for a later deploy once the earlier reload is ten seconds old", async () => {
    fire("vite:preloadError")
    await settle()
    vi.setSystemTime(NOW + 10_000)
    fire("vite:preloadError")
    await settle()

    expect(browser.reload).toHaveBeenCalledTimes(2)
  })

  it.each(["beforeunload", "pagehide"])("leaves a navigation away alone after %s", async (leaving) => {
    fire(leaving)
    fire("vite:preloadError")
    await settle()

    expect(browser.reload).not.toHaveBeenCalled()
  })

  it("reloads again for a page the browser brings back from its back-forward cache", async () => {
    fire("pagehide")
    fire("pageshow")
    fire("vite:preloadError")
    await settle()

    expect(browser.reload).toHaveBeenCalledOnce()
  })
})
