import { existsSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { LANDING_HERO_FONT_PRELOAD, getCriticalFontPreloads } from "~/src/presentation/document-assets"

describe("getCriticalFontPreloads", () => {
  it("preloads the latin body and display fonts for English", () => {
    expect(getCriticalFontPreloads("en-US").map((preload) => preload.href)).toStrictEqual([
      "/fonts/manrope-latin-wght-normal.woff2",
      "/fonts/cormorant-garamond-latin-400-normal.woff2",
    ])
  })

  it("preloads the latin and the latin-ext files for Polish, whose text mixes plain letters with diacritics", () => {
    expect(getCriticalFontPreloads("pl-PL").map((preload) => preload.href)).toStrictEqual([
      "/fonts/manrope-latin-wght-normal.woff2",
      "/fonts/cormorant-garamond-latin-400-normal.woff2",
      "/fonts/manrope-latin-ext-wght-normal.woff2",
      "/fonts/cormorant-garamond-latin-ext-400-normal.woff2",
    ])
  })

  it("marks every entry as an anonymous woff2 font preload", () => {
    for (const preload of [...getCriticalFontPreloads("pl-PL"), LANDING_HERO_FONT_PRELOAD]) {
      expect(preload.as).toBe("font")
      expect(preload.crossOrigin).toBe("anonymous")
      expect(preload.rel).toBe("preload")
      expect(preload.type).toBe("font/woff2")
    }
  })

  it("points every preload at a font file the site serves", () => {
    for (const { href } of [...getCriticalFontPreloads("pl-PL"), LANDING_HERO_FONT_PRELOAD]) {
      expect(existsSync(`public${href}`)).toBe(true)
    }
  })
})

describe("LANDING_HERO_FONT_PRELOAD", () => {
  it("preloads the italic face the second line of the home page heading is set in", () => {
    expect(LANDING_HERO_FONT_PRELOAD.href).toBe("/fonts/cormorant-garamond-latin-400-italic.woff2")
  })
})
