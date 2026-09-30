import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getAssetCdnBase, isAssetCdnUrl } from "~/src/lib/url"

import { DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"

const { env } = vi.hoisted(() => ({ env: { VITE_R2_URL: "" } }))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: (fn: unknown) => ({ client: () => fn }) }),
}))

describe("getAssetCdnBase", () => {
  beforeEach(() => {
    env.VITE_R2_URL = "https://images.test/"
  })

  it("strips the trailing slash from the configured bucket origin", () => {
    expect(getAssetCdnBase()).toBe("https://images.test")
  })

  it.each([[""], ["https://your-production-cdn-domain.com"], ["https://cdn.your-production-cdn-domain.com/assets"]])(
    "falls back to the bundled bucket for the unconfigured value %j",
    (value) => {
      env.VITE_R2_URL = value
      expect(getAssetCdnBase()).toBe(DEFAULT_R2_PUBLIC_URL)
    },
  )
})

describe("isAssetCdnUrl", () => {
  beforeEach(() => {
    env.VITE_R2_URL = "https://images.test"
  })

  it.each([["products/ring.jpg"], ["/products/ring.jpg"], [""], ["data:image/png;base64,AAAA"]])(
    "rejects the non-absolute source %j",
    (source) => {
      expect(isAssetCdnUrl(source)).toBe(false)
    },
  )

  it("recognises the configured bucket origin over both schemes", () => {
    expect(isAssetCdnUrl("https://images.test/products/ring.jpg")).toBe(true)
    expect(isAssetCdnUrl("http://images.test/products/ring.jpg")).toBe(true)
  })

  it("recognises any r2.dev bucket even when another origin is configured", () => {
    expect(isAssetCdnUrl(`${DEFAULT_R2_PUBLIC_URL}/products/ring.jpg`)).toBe(true)
    expect(isAssetCdnUrl("https://pub-other.r2.dev/ring.jpg")).toBe(true)
  })

  it("does not treat a lookalike host as the bucket", () => {
    expect(isAssetCdnUrl("https://images.test.evil.example/ring.jpg")).toBe(false)
    expect(isAssetCdnUrl("https://notimages.test/ring.jpg")).toBe(false)
    expect(isAssetCdnUrl("https://r2.dev.evil.example/ring.jpg")).toBe(false)
  })

  it("reports false instead of throwing for an unparsable absolute url", () => {
    expect(isAssetCdnUrl("https://")).toBe(false)
  })
})
