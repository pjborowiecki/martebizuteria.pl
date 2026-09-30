import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { StorefrontCriticalFontsHead } from "~/src/presentation/components/custom/storefront-critical-fonts-head"

import { getCriticalFontPreloads } from "~/src/presentation/document-assets"

const renderHead = (locale: "en-US" | "pl-PL") => {
  const { container } = renderWithProviders(<StorefrontCriticalFontsHead locale={locale} />)

  return {
    container,
    preloads: [...document.head.querySelectorAll("link")],
  }
}

beforeEach(() => {
  document.head.innerHTML = ""
})

afterEach(() => {
  cleanup()
})

describe("StorefrontCriticalFontsHead", () => {
  it("hoists both critical font preloads into the document head", () => {
    expect(renderHead("en-US").preloads).toHaveLength(2)
  })

  it("preloads the latin subsets for English", () => {
    expect(renderHead("en-US").preloads.map((link) => link.getAttribute("href"))).toStrictEqual([
      "/fonts/manrope-latin-wght-normal.woff2",
      "/fonts/cormorant-garamond-latin-400-normal.woff2",
    ])
  })

  it("preloads the extended latin subsets for Polish, which needs the diacritics", () => {
    expect(renderHead("pl-PL").preloads.map((link) => link.getAttribute("href"))).toStrictEqual([
      "/fonts/manrope-latin-ext-wght-normal.woff2",
      "/fonts/cormorant-garamond-latin-ext-400-normal.woff2",
    ])
  })

  it("marks every preload as an anonymous woff2 font", () => {
    for (const link of renderHead("en-US").preloads) {
      expect(link).toHaveAttribute("rel", "preload")
      expect(link).toHaveAttribute("as", "font")
      expect(link).toHaveAttribute("type", "font/woff2")
      expect(link).toHaveAttribute("crossorigin", "anonymous")
    }
  })

  it("renders exactly the preloads the document asset helper declares", () => {
    expect(renderHead("pl-PL").preloads.map((link) => link.getAttribute("href"))).toStrictEqual(
      getCriticalFontPreloads("pl-PL").map((preload) => preload.href),
    )
  })

  it("inlines the critical font faces in a style element rather than a stylesheet request", () => {
    const { container } = renderHead("en-US")

    expect(container.querySelectorAll("style")).toHaveLength(1)
    expect(container.querySelector('link[rel="stylesheet"]')).toBeNull()
  })
})
