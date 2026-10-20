import { describe, expect, it } from "vite-plus/test"

import { gsapToolkit } from "~/src/integrations/gsap/gsap.config"

describe("gsap.config on the server", () => {
  it("loads without touching the DOM and leaves GSAP's defaults alone, since only the browser animates", () => {
    expect(gsapToolkit.gsap.defaults().duration).toBe(0.5)
    expect(gsapToolkit.ScrollTrigger.getAll()).toStrictEqual([])
  })
})
