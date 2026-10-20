import { describe, expect, it } from "vite-plus/test"

import { gsapToolkit } from "~/src/integrations/gsap/gsap.config"
import { getLoadedGsap, provideGsap } from "~/src/integrations/gsap/gsap.loader"

describe("gsap.loader on the server", () => {
  it("keeps nothing, since only the browser animates", () => {
    provideGsap(gsapToolkit)

    expect(getLoadedGsap()).toBeUndefined()
  })
})
