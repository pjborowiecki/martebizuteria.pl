import { describe, expect, it, vi } from "vite-plus/test"

const configModule = vi.hoisted(() => ({ evaluations: 0 }))

vi.mock("~/src/integrations/gsap/gsap.config", () => {
  configModule.evaluations += 1

  return { gsapToolkit: { ScrollTrigger: { name: "ScrollTrigger" }, gsap: { name: "gsap" } } }
})

const { getLoadedGsap, loadGsap, subscribeToGsap } = await import("~/src/integrations/gsap/gsap.loader")

describe("gsap.loader", () => {
  it("has nothing to hand out before anything asked for the library", () => {
    expect(getLoadedGsap()).toBeUndefined()
    expect(configModule.evaluations).toBe(0)
  })

  it("loads the configured library once, tells every subscriber and keeps it for later readers", async () => {
    const listener = vi.fn<() => void>()
    const unsubscribe = subscribeToGsap(listener)

    const [first, second] = await Promise.all([loadGsap(), loadGsap()])
    unsubscribe()

    expect(first).toBe(second)
    expect(first.gsap).toStrictEqual({ name: "gsap" })
    expect(getLoadedGsap()).toBe(first)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(configModule.evaluations).toBe(1)
  })

  it("stops telling a subscriber once it unsubscribed", async () => {
    const listener = vi.fn<() => void>()
    subscribeToGsap(listener)()

    await loadGsap()

    expect(listener).not.toHaveBeenCalled()
  })
})
