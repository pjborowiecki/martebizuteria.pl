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

const { ScrollToPlugin, ScrollTrigger, gsap, useGSAP } = await import("~/src/integrations/gsap/gsap.config")

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

  it("registers ScrollToPlugin, so the scrollTo tween property is understood", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const tween = gsap.to(document.createElement("div"), { duration: 0, scrollTo: 0 })

    expect(warn).not.toHaveBeenCalled()

    tween.kill()
  })

  it("re-exports the scroll plugins it registered", () => {
    expect(ScrollTrigger.version).toBe(gsap.version)
    expect(ScrollToPlugin.name).toBe("scrollTo")
  })

  it("re-exports the animation hook the components use", () => {
    expect(typeof useGSAP).toBe("function")
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
