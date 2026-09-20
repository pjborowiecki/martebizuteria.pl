import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  ImagePrefetchService,
  PLACEHOLDER_IMAGE,
  executeDomPrefetch,
  prefetchProductThumbnails,
  prefetchRawImageUrls,
  prefetchSingleProductImage,
} from "~/src/lib/image"

const { transformUrl } = vi.hoisted(() => ({
  transformUrl: vi.fn(({ url, width }: { url: string; width: number }) => `${url}?width=${width}`),
}))

vi.mock("unpic", () => ({ transformUrl }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    client: (fn: unknown) => fn,
    server: () => ({ client: (fn: unknown) => fn }),
  }),
}))
vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))

const images: { decoding: string; fetchPriority: string; sizes: string; src: string; srcset: string }[] = []

describe("image prefetching", () => {
  beforeEach(() => {
    images.length = 0
    transformUrl.mockClear()
    vi.stubGlobal(
      "Image",
      class {
        decoding = ""
        fetchPriority = ""
        sizes = ""
        src = ""
        srcset = ""

        constructor() {
          images.push(this)
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("skips lazy images and already prefetched sources, preserving responsive image attributes", () => {
    const cache = new ImagePrefetchService()
    executeDomPrefetch(
      [
        { loading: "lazy", src: "lazy.jpg" },
        { sizes: "50vw", src: "first.jpg", srcset: "first.jpg 1x, first-large.jpg 2x" },
        { src: "first.jpg" },
      ],
      cache,
    )

    expect(images).toMatchObject([
      {
        decoding: "async",
        fetchPriority: "low",
        sizes: "50vw",
        src: "first.jpg",
        srcset: "first.jpg 1x, first-large.jpg 2x",
      },
    ])
    expect(cache.getSize()).toBe(1)
  })

  it("evicts old sources when its cache fills", () => {
    const cache = new ImagePrefetchService(2)
    executeDomPrefetch([{ src: "one.jpg" }, { src: "two.jpg" }, { src: "three.jpg" }, { src: "one.jpg" }], cache)

    expect(images.map((image) => image.src)).toStrictEqual(["one.jpg", "two.jpg", "three.jpg", "one.jpg"])
    expect(cache.getSize()).toBe(2)
    expect(cache.isSeen("two.jpg")).toBe(false)
    cache.clear()
    expect(cache.getSize()).toBe(0)
  })

  it("only transforms the first six available product thumbnails", () => {
    const products = [
      { thumbnail: null },
      { thumbnail: PLACEHOLDER_IMAGE },
      ...Array.from({ length: 100 }, (_, index) => ({ thumbnail: `https://images.test/${index}.jpg` })),
    ]

    prefetchProductThumbnails(products, new ImagePrefetchService())

    expect(transformUrl).toHaveBeenCalledTimes(6)
    expect(images).toHaveLength(6)
    expect(images[0]?.src).toBe("https://images.test/0.jpg?width=256")
    expect(images[5]?.src).toBe("https://images.test/5.jpg?width=256")
  })

  it("prefetches one full product image and skips placeholders", () => {
    const cache = new ImagePrefetchService()
    prefetchSingleProductImage({ thumbnail: null }, cache)
    prefetchSingleProductImage({ thumbnail: "https://images.test/product.jpg" }, cache)
    prefetchSingleProductImage({ thumbnail: "https://images.test/product.jpg" }, cache)

    expect(images).toHaveLength(1)
    expect(images[0]?.src).toBe("https://images.test/product.jpg?width=512")
  })

  it("bounds raw image transformations to the prefetch budget", () => {
    const urls = Array.from({ length: 100 }, (_, index) => `https://images.test/${index}.jpg`)

    prefetchRawImageUrls(urls, new ImagePrefetchService(), { height: 100, quality: 60, width: 200 })

    expect(transformUrl).toHaveBeenCalledTimes(6)
    expect(images).toHaveLength(6)
    expect(images[0]?.src).toBe("https://images.test/0.jpg?width=200")
  })
})
