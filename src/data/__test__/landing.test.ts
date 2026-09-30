import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.test" } }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    client: (fn: unknown) => fn,
    server: (fn: unknown) => ({ client: () => fn }),
  }),
}))

import { LANDING_HERO_IMG, LANDING_VIDEO_POSTER, LANDING_VIDEO_SRC } from "~/src/data/landing"

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
