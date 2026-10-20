import { describe, expect, it, vi } from "vite-plus/test"

const configModule = vi.hoisted(() => ({ evaluations: 0 }))

vi.mock("~/src/integrations/gsap/gsap.config", () => {
  configModule.evaluations += 1
  if (configModule.evaluations === 1) {
    throw new TypeError("Importing a module script failed.")
  }

  return { gsapToolkit: { ScrollTrigger: { name: "ScrollTrigger" }, gsap: { name: "gsap" } } }
})

const { getLoadedGsap, loadGsap } = await import("~/src/integrations/gsap/gsap.loader")

describe("gsap.loader after a failed download", () => {
  it("passes the failure on and keeps nothing for later readers", async () => {
    await expect(loadGsap()).rejects.toBeInstanceOf(Error)

    expect(getLoadedGsap()).toBeUndefined()
  })

  it("downloads the library again on the next request instead of repeating the failure", async () => {
    const toolkit = await loadGsap()

    expect(toolkit.gsap).toStrictEqual({ name: "gsap" })
    expect(getLoadedGsap()).toBe(toolkit)
    expect(configModule.evaluations).toBe(2)
  })
})
