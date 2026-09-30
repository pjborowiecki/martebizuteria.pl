import { describe, expect, it } from "vite-plus/test"

import { buildProductImageRows, galleryImagesToReplacePayload, isProductLevelImage } from "~/src/modules/product-image/product-image.utils"

const gallery = [
  { alt: "front", id: "img-1", url: "products/ring-front.jpg" },
  { alt: "", id: "img-2", url: "products/ring-side.jpg" },
  { alt: "back", id: "img-3", url: "products/ring-back.jpg" },
]

describe("isProductLevelImage", () => {
  it.each([[null], [undefined]])("treats the variant id %j as product level", (variantId) => {
    expect(isProductLevelImage(variantId)).toBe(true)
  })

  it("treats an assigned variant id as variant level", () => {
    expect(isProductLevelImage("variant-1")).toBe(false)
  })
})

describe("galleryImagesToReplacePayload", () => {
  it("moves the chosen main image to the front and re-ranks the rest", () => {
    expect(galleryImagesToReplacePayload(gallery, "img-3").map((image) => [image.id, image.rank])).toStrictEqual([
      ["img-3", 0],
      ["img-1", 1],
      ["img-2", 2],
    ])
  })

  it("keeps the gallery order when the main image is already first", () => {
    expect(galleryImagesToReplacePayload(gallery, "img-1").map((image) => image.id)).toStrictEqual(["img-1", "img-2", "img-3"])
  })

  it.each([[undefined], ["img-missing"]])("keeps the gallery order when the main image id is %j", (mainImageId) => {
    expect(galleryImagesToReplacePayload(gallery, mainImageId).map((image) => image.id)).toStrictEqual(["img-1", "img-2", "img-3"])
  })

  it("turns a blank alt text into no alt text", () => {
    const [, second] = galleryImagesToReplacePayload(gallery, "img-1")

    expect(second?.alt).toBeUndefined()
  })

  it("stamps the variant id on every row when given one", () => {
    expect(galleryImagesToReplacePayload(gallery, "img-1", "variant-1").every((image) => image.variantId === "variant-1")).toBe(true)
  })

  it("leaves the variant id absent for product level images", () => {
    expect(galleryImagesToReplacePayload(gallery, "img-1")[0]?.variantId).toBeUndefined()
  })

  it("produces nothing for an empty gallery", () => {
    expect(galleryImagesToReplacePayload([], "img-1")).toStrictEqual([])
  })
})

describe("buildProductImageRows", () => {
  it("keeps the supplied ids and ranks", () => {
    expect(buildProductImageRows("product-1", [{ alt: "front", id: "img-1", rank: 0, url: "a.jpg" }])).toStrictEqual([
      { alt: "front", id: "img-1", productId: "product-1", rank: 0, url: "a.jpg", variantId: undefined },
    ])
  })

  it("mints an id for a row that has none", () => {
    const [row] = buildProductImageRows("product-1", [{ rank: 0, url: "a.jpg" }])

    expect(row?.id).toBeDefined()
    expect(row?.id).not.toBe("")
  })

  it("gives each new row its own id", () => {
    const rows = buildProductImageRows("product-1", [
      { rank: 0, url: "a.jpg" },
      { rank: 1, url: "b.jpg" },
    ])

    expect(rows[0]?.id).not.toBe(rows[1]?.id)
  })

  it("turns a blank alt text into no alt text", () => {
    expect(buildProductImageRows("product-1", [{ alt: "", rank: 0, url: "a.jpg" }])[0]?.alt).toBeUndefined()
  })

  it("carries the variant id through", () => {
    expect(buildProductImageRows("product-1", [{ rank: 0, url: "a.jpg", variantId: "variant-1" }])[0]?.variantId).toBe("variant-1")
  })
})
