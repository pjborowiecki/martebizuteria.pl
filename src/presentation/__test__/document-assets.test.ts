import { describe, expect, it } from "vite-plus/test"

import { getCriticalFontPreloads } from "~/src/presentation/document-assets"

describe("getCriticalFontPreloads", () => {
  it("preloads the latin subsets for English", () => {
    expect(getCriticalFontPreloads("en-US").map((preload) => preload.href)).toStrictEqual([
      "/fonts/manrope-latin-wght-normal.woff2",
      "/fonts/cormorant-garamond-latin-400-normal.woff2",
    ])
  })

  it("preloads the latin-ext subsets for Polish", () => {
    expect(getCriticalFontPreloads("pl-PL").map((preload) => preload.href)).toStrictEqual([
      "/fonts/manrope-latin-ext-wght-normal.woff2",
      "/fonts/cormorant-garamond-latin-ext-400-normal.woff2",
    ])
  })

  it("marks every entry as an anonymous woff2 font preload", () => {
    for (const preload of getCriticalFontPreloads("en-US")) {
      expect(preload.as).toBe("font")
      expect(preload.crossOrigin).toBe("anonymous")
      expect(preload.rel).toBe("preload")
      expect(preload.type).toBe("font/woff2")
    }
  })

  it("preloads one body font and one display font", () => {
    expect(getCriticalFontPreloads("pl-PL")).toHaveLength(2)
  })
})
