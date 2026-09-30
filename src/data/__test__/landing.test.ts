import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.test" } }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    client: (fn: unknown) => fn,
    server: (fn: unknown) => ({ client: () => fn }),
  }),
}))

import { LANDING_HERO_IMG, LANDING_SHOP_COLLECTIONS, LANDING_VIDEO_POSTER, LANDING_VIDEO_SRC } from "~/src/data/landing"

describe("landing media", () => {
  it("resolves the hero image, the video and its poster to absolute asset urls", () => {
    for (const asset of [LANDING_HERO_IMG, LANDING_VIDEO_POSTER, LANDING_VIDEO_SRC]) {
      expect(asset.startsWith("https://")).toBe(true)
    }
  })

  it("keeps the asset file names", () => {
    expect(LANDING_HERO_IMG.endsWith("/marketing/hero.webp")).toBe(true)
    expect(LANDING_VIDEO_SRC.endsWith("/marketing/landing-video.mp4")).toBe(true)
    expect(LANDING_VIDEO_POSTER.endsWith("/placeholder.svg")).toBe(true)
  })
})

describe("LANDING_SHOP_COLLECTIONS", () => {
  it("gives every collection its own slug, name key and image", () => {
    const slugs = LANDING_SHOP_COLLECTIONS.map((collection) => collection.slug)
    const nameKeys = LANDING_SHOP_COLLECTIONS.map((collection) => collection.nameKey)
    const images = LANDING_SHOP_COLLECTIONS.map((collection) => collection.image)

    expect(new Set(slugs).size).toBe(slugs.length)
    expect(new Set(nameKeys).size).toBe(nameKeys.length)
    expect(new Set(images).size).toBe(images.length)
  })

  it("pairs every name key with the description key of the same item", () => {
    for (const collection of LANDING_SHOP_COLLECTIONS) {
      expect(collection.nameKey.replace(/\.name$/u, "")).toBe(collection.descKey.replace(/\.description$/u, ""))
    }
  })

  it("namespaces every translation key under items", () => {
    for (const collection of LANDING_SHOP_COLLECTIONS) {
      expect(collection.nameKey.startsWith("items.")).toBe(true)
      expect(collection.descKey.startsWith("items.")).toBe(true)
    }
  })
})
