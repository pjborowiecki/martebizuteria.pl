import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { IMAGE_CONSTANTS, PLACEHOLDER_IMAGE, getOptimizedImageUrl, getProductImageUrl } from "~/src/lib/image"

import { APP_URL } from "~/src/presentation/branding/app"

const { transformUrl } = vi.hoisted(() => ({ transformUrl: vi.fn<(...args: unknown[]) => string | undefined>() }))

const { assetCdn } = vi.hoisted(() => {
  const state: { hosted: boolean } = { hosted: false }

  return { assetCdn: state }
})

const OPTIMIZED = `${APP_URL}/cdn-cgi/image/width=256/ring.jpg`

vi.mock("unpic", () => ({ transformUrl }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    client: (fn: unknown) => fn,
    server: () => ({ client: (fn: unknown) => fn }),
  }),
}))
vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => assetCdn.hosted,
  resolveAssetURL: (pathOrUrl: string) =>
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") ? pathOrUrl : `https://assets.test/${pathOrUrl}`,
}))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getProductImageUrl", () => {
  it.each([[undefined], [null], [""]])("falls back to the placeholder for %j", (src) => {
    expect(getProductImageUrl(src)).toBe(PLACEHOLDER_IMAGE)
    expect(PLACEHOLDER_IMAGE).toBe("https://assets.test/placeholder.svg")
  })

  it("keeps a stored thumbnail key as it is", () => {
    expect(getProductImageUrl("products/ring.jpg")).toBe("products/ring.jpg")
  })
})

describe("getOptimizedImageUrl", () => {
  beforeEach(() => {
    assetCdn.hosted = false
    transformUrl.mockReset()
    transformUrl.mockReturnValue(OPTIMIZED)
  })

  it("resolves a bucket key against the asset origin before transforming it", () => {
    expect(getOptimizedImageUrl({ height: 256, quality: undefined, src: "products/ring.jpg", width: 256 })).toBe(OPTIMIZED)
    expect(transformUrl.mock.calls[0]?.[0]).toStrictEqual({
      height: 256,
      provider: "cloudflare",
      quality: IMAGE_CONSTANTS.DEFAULT_QUALITY,
      url: "https://assets.test/products/ring.jpg",
      width: 256,
    })
  })

  it("asks the cloudflare provider for an auto format at the store hostname", () => {
    getOptimizedImageUrl({ height: 100, quality: undefined, src: "https://other.test/ring.jpg", width: 200 })

    expect(transformUrl.mock.calls[0]?.slice(1)).toStrictEqual([
      { cloudflare: { f: "auto", format: "auto" } },
      { cloudflare: { domain: new URL(APP_URL).hostname } },
    ])
  })

  it("passes an explicit quality through instead of the default", () => {
    getOptimizedImageUrl({ height: 100, quality: 42, src: "https://other.test/ring.jpg", width: 200 })

    expect(transformUrl.mock.calls[0]?.[0]).toMatchObject({ quality: 42 })
  })

  it("uses the configured image transformation domain for an external HTTP image", () => {
    vi.stubEnv("VITE_IMAGE_CDN_DOMAIN", "images.marte.test")
    getOptimizedImageUrl({ height: 100, quality: 42, src: "http://other.test/ring.jpg", width: 200 })

    expect(transformUrl).toHaveBeenCalledWith(
      { height: 100, provider: "cloudflare", quality: 42, url: "http://other.test/ring.jpg", width: 200 },
      { cloudflare: { f: "auto", format: "auto" } },
      { cloudflare: { domain: "images.marte.test" } },
    )
  })

  it.each([["https://images.unsplash.com/photo-1"], ["https://plus.unsplash.com/photo-2"]])(
    "serves the unsplash source %s untransformed",
    (src) => {
      expect(getOptimizedImageUrl({ height: 256, quality: undefined, src, width: 256 })).toBe(src)
      expect(transformUrl).not.toHaveBeenCalled()
    },
  )

  it("serves an image already on the asset cdn untransformed", () => {
    assetCdn.hosted = true

    expect(getOptimizedImageUrl({ height: 256, quality: undefined, src: "https://images.test/ring.jpg", width: 256 })).toBe(
      "https://images.test/ring.jpg",
    )
    expect(transformUrl).not.toHaveBeenCalled()
  })

  it("falls back to the resolved source when the provider returns nothing usable", () => {
    transformUrl.mockReturnValue(undefined)

    expect(getOptimizedImageUrl({ height: 256, quality: undefined, src: "products/ring.jpg", width: 256 })).toBe(
      "https://assets.test/products/ring.jpg",
    )
  })

  it("falls back to the resolved source when the provider throws", () => {
    transformUrl.mockImplementation(() => {
      throw new Error("unsupported provider")
    })

    expect(getOptimizedImageUrl({ height: 256, quality: undefined, src: "products/ring.jpg", width: 256 })).toBe(
      "https://assets.test/products/ring.jpg",
    )
  })
})
