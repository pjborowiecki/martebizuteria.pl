import { describe, expect, it } from "vite-plus/test"

import {
  productImagesToGallery,
  resolveMainImageId,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-image-form.utils"

const IMAGES = [
  { alt: "front", id: "img-1", url: "https://cdn.test/a.webp" },
  { alt: "back", id: "img-2", url: "https://cdn.test/b.webp" },
]

describe("productImagesToGallery", () => {
  it("keeps the order and drops everything but id and url", () => {
    expect(productImagesToGallery(IMAGES)).toStrictEqual([
      { id: "img-1", url: "https://cdn.test/a.webp" },
      { id: "img-2", url: "https://cdn.test/b.webp" },
    ])
  })

  it("maps an empty gallery to an empty array", () => {
    expect(productImagesToGallery([])).toStrictEqual([])
  })
})

describe("resolveMainImageId", () => {
  it("has no main image when the product has no images", () => {
    expect(resolveMainImageId([], "https://cdn.test/a.webp")).toBeUndefined()
  })

  it("matches the stored thumbnail url to its image id", () => {
    expect(resolveMainImageId(IMAGES, "https://cdn.test/b.webp")).toBe("img-2")
  })

  it("falls back to the first image when the thumbnail is absent", () => {
    expect(resolveMainImageId(IMAGES, null)).toBe("img-1")
    expect(resolveMainImageId(IMAGES, undefined)).toBe("img-1")
  })

  it("falls back to the first image when the thumbnail points at a deleted url", () => {
    expect(resolveMainImageId(IMAGES, "https://cdn.test/removed.webp")).toBe("img-1")
  })

  it("does not treat an empty thumbnail string as a match", () => {
    expect(resolveMainImageId(IMAGES, "")).toBe("img-1")
  })
})
