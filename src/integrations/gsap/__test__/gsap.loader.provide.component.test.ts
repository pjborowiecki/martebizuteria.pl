import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/integrations/gsap/gsap.config", () => ({
  gsapToolkit: { ScrollTrigger: { name: "ScrollTrigger" }, gsap: { name: "gsap" } },
}))

const { gsapToolkit } = await import("~/src/integrations/gsap/gsap.config")
const { getLoadedGsap, loadGsap, provideGsap, subscribeToGsap } = await import("~/src/integrations/gsap/gsap.loader")

const pageToolkit = { ...gsapToolkit }

describe("gsap.loader with a toolkit that came with the page's own code", () => {
  it("hands it to every reader and tells the subscribers, without importing the library again", async () => {
    const listener = vi.fn<() => void>()
    const unsubscribe = subscribeToGsap(listener)

    provideGsap(pageToolkit)
    unsubscribe()

    expect(getLoadedGsap()).toBe(pageToolkit)
    expect(listener).toHaveBeenCalledTimes(1)
    await expect(loadGsap()).resolves.toBe(pageToolkit)
  })
})
