import { describe, expect, it, vi } from "vite-plus/test"

vi.hoisted(() => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      matches: query.includes("no-preference"),
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })
})

const {
  gsapToolkit: { ScrollTrigger, gsap },
} = await import("~/src/integrations/gsap/gsap.config")

describe("gsap.config", () => {
  it("sets the project's tween defaults once, in the browser", () => {
    const defaults = gsap.defaults()

    expect(defaults.duration).toBe(0.8)
    expect(defaults.ease).toBe(gsap.parseEase("power3.out"))
  })

  it("registers ScrollTrigger, so scroll driven timelines can be created", () => {
    document.body.innerHTML = "<div id='scroll-section'></div>"
    const trigger = ScrollTrigger.create({ trigger: "#scroll-section" })

    expect(ScrollTrigger.getAll()).toContain(trigger)

    trigger.kill()
    document.body.innerHTML = ""
  })

  it("re-exports the ScrollTrigger build that matches the core", () => {
    expect(ScrollTrigger.version).toBe(gsap.version)
  })

  it("applies the defaults to a tween that declares none", () => {
    const element = document.createElement("div")
    const tween = gsap.to(element, { x: 10 })

    expect(tween.duration()).toBe(0.8)
    tween.kill()
  })

  it("lets a tween override the shared duration", () => {
    const element = document.createElement("div")
    const tween = gsap.to(element, { duration: 0.2, x: 10 })

    expect(tween.duration()).toBe(0.2)
    tween.kill()
  })
})
