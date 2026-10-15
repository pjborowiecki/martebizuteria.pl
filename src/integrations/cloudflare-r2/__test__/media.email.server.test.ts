import { Buffer } from "node:buffer"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { bucket } = vi.hoisted(() => ({
  bucket: { get: vi.fn<(key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer>; size: number } | null>>() },
}))

vi.mock("cloudflare:workers", () => ({ env: { IMAGES: { get: bucket.get } } }))
vi.mock("~/src/lib/url", () => ({ isAssetCdnUrl: (url: string) => url.startsWith("https://images.example.test/") }))

import {
  MAX_INLINE_EMAIL_IMAGES,
  MAX_INLINE_EMAIL_IMAGES_TOTAL_BYTES,
  MAX_INLINE_EMAIL_IMAGE_BYTES,
  embedEmailImages,
} from "~/src/integrations/cloudflare-r2/media.email.server"

const CDN = "https://images.example.test"

const storedObject = (bytes: number) => {
  const { buffer } = new Uint8Array(bytes).fill(7)

  return { arrayBuffer: () => Promise.resolve(buffer), size: bytes }
}

beforeEach(() => {
  bucket.get.mockReset()
  bucket.get.mockImplementation((key) => Promise.resolve(storedObject(key.length)))
})

describe("embedEmailImages", () => {
  it("embeds each image from the shop's bucket once, under its own content id", async () => {
    const { attachments, sources } = await embedEmailImages([`${CDN}/products/a.webp`, `${CDN}/products/b.webp`, `${CDN}/products/a.webp`])

    expect(bucket.get.mock.calls.map(([key]) => key)).toStrictEqual(["products/a.webp", "products/b.webp"])
    expect(attachments).toStrictEqual([
      { content: Buffer.from(new Uint8Array(15).fill(7)).toString("base64"), contentId: "image-1", filename: "a.webp" },
      { content: Buffer.from(new Uint8Array(15).fill(7)).toString("base64"), contentId: "image-2", filename: "b.webp" },
    ])
    expect(sources).toStrictEqual(
      new Map([
        [`${CDN}/products/a.webp`, "cid:image-1"],
        [`${CDN}/products/b.webp`, "cid:image-2"],
      ]),
    )
  })

  it("leaves an image from another host linked without reading it", async () => {
    const { attachments, sources } = await embedEmailImages(["https://martebizuteria.pl/placeholder.svg"])

    expect(bucket.get).not.toHaveBeenCalled()
    expect(attachments).toStrictEqual([])
    expect(sources.size).toBe(0)
  })

  it("links an image the bucket does not hold, one over the size of a single embedded image, and one it fails to read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    bucket.get.mockImplementation((key) => {
      if (key === "products/missing.webp") {
        return Promise.resolve(null)
      }

      if (key === "products/huge.webp") {
        return Promise.resolve(storedObject(MAX_INLINE_EMAIL_IMAGE_BYTES + 1))
      }

      return Promise.reject(new Error("R2 unavailable"))
    })

    const { attachments, sources } = await embedEmailImages([
      `${CDN}/products/missing.webp`,
      `${CDN}/products/huge.webp`,
      `${CDN}/products/broken.webp`,
    ])

    expect(attachments).toStrictEqual([])
    expect(sources.size).toBe(0)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it("stops embedding before the images together would pass the size cap, and links the rest", async () => {
    const half = MAX_INLINE_EMAIL_IMAGE_BYTES
    const fitting = Math.floor(MAX_INLINE_EMAIL_IMAGES_TOTAL_BYTES / half)
    bucket.get.mockImplementation(() => Promise.resolve(storedObject(half)))
    const urls = Array.from({ length: fitting + 1 }, (_, index) => `${CDN}/products/${index}.webp`)

    const { attachments, sources } = await embedEmailImages(urls)

    expect(attachments).toHaveLength(fitting)
    expect(sources.has(`${CDN}/products/${fitting}.webp`)).toBe(false)
  })

  it("embeds no more than its image limit", async () => {
    const urls = Array.from({ length: MAX_INLINE_EMAIL_IMAGES + 2 }, (_, index) => `${CDN}/products/${index}.webp`)

    const { attachments } = await embedEmailImages(urls)

    expect(bucket.get).toHaveBeenCalledTimes(MAX_INLINE_EMAIL_IMAGES)
    expect(attachments).toHaveLength(MAX_INLINE_EMAIL_IMAGES)
  })
})
