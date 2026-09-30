import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.test" } }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    client: (fn: unknown) => fn,
    server: (fn: unknown) => ({ client: () => fn }),
  }),
}))

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

import {
  type LandingCategoryPanel,
  resolveLandingCategoryPanelCopy,
} from "~/src/presentation/components/custom/pages/landing-page/sections/landing-category-panel.utils"

const panel: LandingCategoryPanel = {
  handle: "rings",
  id: "cat_1",
  image: "https://cdn.example.com/rings.webp",
  shortDescriptions: { "en-US": "Hand finished", "pl-PL": "Wykonane recznie" },
  subtitles: { "en-US": "Sculpted silver", "pl-PL": "Rzezbione srebro" },
  titles: { "en-US": "Rings", "pl-PL": "Pierscionki" },
}

describe("resolveLandingCategoryPanelCopy", () => {
  it("resolves every string for the requested locale", () => {
    expect(resolveLandingCategoryPanelCopy(panel, "en-US")).toStrictEqual({
      handle: "rings",
      image: "https://cdn.example.com/rings.webp",
      subtitle: "Hand finished",
      tag: "Rings",
      title: "Sculpted silver",
    })
  })

  it("uses the category title as the tag and the subtitle as the title", () => {
    const copy = resolveLandingCategoryPanelCopy(panel, "pl-PL")

    expect(copy.tag).toBe("Pierscionki")
    expect(copy.title).toBe("Rzezbione srebro")
  })

  it("falls back to the default locale when the requested locale is unsupported", () => {
    expect(resolveLandingCategoryPanelCopy(panel, "de-DE").tag).toBe("Pierscionki")
  })

  it("falls back to the default locale string when the requested one is blank", () => {
    const sparse: LandingCategoryPanel = { ...panel, titles: { "en-US": "  ", "pl-PL": "Pierscionki" } }

    expect(resolveLandingCategoryPanelCopy(sparse, "en-US").tag).toBe("Pierscionki")
  })

  it("falls back to any populated locale when the default one is blank", () => {
    const sparse: LandingCategoryPanel = { ...panel, subtitles: { "en-US": "Sculpted silver", "pl-PL": "" } }

    expect(resolveLandingCategoryPanelCopy(sparse, "pl-PL").title).toBe("Sculpted silver")
  })

  it("returns an empty string when no locale carries the text", () => {
    const empty: LandingCategoryPanel = { ...panel, shortDescriptions: { "en-US": "", "pl-PL": "" } }

    expect(resolveLandingCategoryPanelCopy(empty, "en-US").subtitle).toBe("")
  })

  it("trims the resolved text", () => {
    const padded: LandingCategoryPanel = { ...panel, titles: { "en-US": "  Rings  ", "pl-PL": "Pierscionki" } }

    expect(resolveLandingCategoryPanelCopy(padded, "en-US").tag).toBe("Rings")
  })

  it("falls back to the placeholder image when the category has none", () => {
    const noImage: LandingCategoryPanel = { ...panel, image: null }

    expect(resolveLandingCategoryPanelCopy(noImage, "en-US").image).toBe(PLACEHOLDER_IMAGE)
  })

  it("falls back to the placeholder image for an empty image", () => {
    const blankImage: LandingCategoryPanel = { ...panel, image: "" }

    expect(resolveLandingCategoryPanelCopy(blankImage, "en-US").image).toBe(PLACEHOLDER_IMAGE)
  })
})
