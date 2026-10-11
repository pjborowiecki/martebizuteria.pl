import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  IMAGE_CONSTANTS,
  PLACEHOLDER_IMAGE,
  getOptimizedImageUrl,
  getProductImageUrl,
  resolveProductImageUrls,
  resolveProductSocialImageUrl,
} from "~/src/lib/image"

import { APP_URL, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "~/src/presentation/branding/app"

const { transformUrl } = vi.hoisted(() => ({ transformUrl: vi.fn<(...args: unknown[]) => string | undefined>() }))

const { assetCdn } = vi.hoisted(() => {
  const state: { hosted: boolean; origin: string } = { hosted: false, origin: "https://assets.test" }

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
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") ? pathOrUrl : `${assetCdn.origin}/${pathOrUrl}`,
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
    assetCdn.origin = "https://assets.test"
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

  it("asks the cloudflare provider for an auto format, redirecting to the original when it cannot transform, at the store hostname", () => {
    getOptimizedImageUrl({ height: 100, quality: undefined, src: "https://other.test/ring.jpg", width: 200 })

    expect(transformUrl.mock.calls[0]?.slice(1)).toStrictEqual([
      { cloudflare: { f: "auto", format: "auto", onerror: "redirect" } },
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
      { cloudflare: { f: "auto", format: "auto", onerror: "redirect" } },
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

  it("resizes an image on the configured asset host through that host, naming the source by its path", () => {
    assetCdn.hosted = true

    expect(getOptimizedImageUrl({ height: 256, quality: undefined, src: "https://images.test/products/ring.jpg", width: 256 })).toBe(
      OPTIMIZED,
    )
    expect(transformUrl).toHaveBeenCalledWith(
      { height: 256, provider: "cloudflare", quality: IMAGE_CONSTANTS.DEFAULT_QUALITY, url: "/products/ring.jpg", width: 256 },
      { cloudflare: { f: "auto", format: "auto", onerror: "redirect" } },
      { cloudflare: { domain: "images.test" } },
    )
  })

  it.each([["https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/ring.jpg"], ["https://pub-preview.r2.dev/products/ring.jpg"]])(
    "serves the r2.dev source %s untransformed, because r2.dev cannot resize images",
    (src) => {
      assetCdn.hosted = true

      expect(getOptimizedImageUrl({ height: 256, quality: undefined, src, width: 256 })).toBe(src)
      expect(transformUrl).not.toHaveBeenCalled()
    },
  )

  it("still transforms an asset whose origin is configured as a path on the store itself", () => {
    assetCdn.origin = "/media"

    expect(getOptimizedImageUrl({ height: 256, quality: undefined, src: "products/ring.jpg", width: 256 })).toBe(OPTIMIZED)
    expect(transformUrl.mock.calls[0]?.[0]).toMatchObject({ url: "/media/products/ring.jpg" })
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

describe("resolveProductImageUrls", () => {
  beforeEach(() => {
    assetCdn.origin = "https://assets.test"
  })

  it("resolves every gallery image of the product against the asset origin", () => {
    expect(
      resolveProductImageUrls({ imageUrls: ["products/ring.jpg", "https://other.test/ring-side.jpg"], thumbnail: "products/thumb.jpg" }),
    ).toStrictEqual(["https://assets.test/products/ring.jpg", "https://other.test/ring-side.jpg"])
  })

  it("falls back to the thumbnail, as the product page does, when the gallery is empty", () => {
    expect(resolveProductImageUrls({ imageUrls: [], thumbnail: "products/thumb.jpg" })).toStrictEqual([
      "https://assets.test/products/thumb.jpg",
    ])
  })

  it("has no image for a product without a gallery or a thumbnail", () => {
    expect(resolveProductImageUrls({ imageUrls: [], thumbnail: null })).toStrictEqual([])
  })
})

describe("resolveProductSocialImageUrl", () => {
  beforeEach(() => {
    assetCdn.hosted = true
    assetCdn.origin = "https://assets.test"
    transformUrl.mockReset()
    transformUrl.mockReturnValue(OPTIMIZED)
  })

  it("asks for the product's main image at the social card size the root head declares", () => {
    expect(resolveProductSocialImageUrl({ imageUrls: ["products/ring.jpg", "products/ring-side.jpg"], thumbnail: null })).toBe(OPTIMIZED)
    expect(transformUrl.mock.calls).toHaveLength(1)
    expect(transformUrl.mock.calls[0]?.[0]).toStrictEqual({
      height: Number(OG_IMAGE_HEIGHT),
      provider: "cloudflare",
      quality: IMAGE_CONSTANTS.DEFAULT_QUALITY,
      url: "/products/ring.jpg",
      width: Number(OG_IMAGE_WIDTH),
    })
  })

  it("leaves the default social image in place for a product with no image", () => {
    expect(resolveProductSocialImageUrl({ imageUrls: [], thumbnail: null })).toBeUndefined()
    expect(transformUrl).not.toHaveBeenCalled()
  })
})
