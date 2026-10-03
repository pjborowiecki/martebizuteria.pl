import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))

import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { toWishlistProduct } from "~/src/modules/wishlist/wishlist.utils"

const ADDED_AT = new Date("2026-09-14T10:00:00.000Z")

const row = {
  addedAt: ADDED_AT,
  handle: "aurora-ring",
  priceMinorUnits: 24_900,
  productId: "p-aurora",
  status: PRODUCT_STATUS.PUBLISHED,
  thumbnail: "products/aurora.webp",
  titles: { "en-US": "Aurora ring", "pl-PL": "Pierścionek Aurora" },
  totalStock: 3,
  variantId: "v-aurora-silver",
  variantTitle: "Silver / 54",
}

describe("toWishlistProduct", () => {
  it("describes a saved product on sale in the shopper's language with its cheapest variant", () => {
    expect(toWishlistProduct(row, "pl-PL")).toStrictEqual({
      addedAt: ADDED_AT,
      available: true,
      handle: "aurora-ring",
      inStock: true,
      priceMinorUnits: 24_900,
      productId: "p-aurora",
      thumbnail: "products/aurora.webp",
      title: "Pierścionek Aurora",
      variantId: "v-aurora-silver",
      variantTitle: "Silver / 54",
    })
  })

  it("describes a product that has no variants left as priceless, out of stock and without a picture", () => {
    const product = toWishlistProduct(
      { ...row, priceMinorUnits: null, thumbnail: null, totalStock: 0, variantId: null, variantTitle: null },
      "en-US",
    )

    expect(product).toMatchObject({
      inStock: false,
      priceMinorUnits: 0,
      thumbnail: undefined,
      variantId: undefined,
      variantTitle: undefined,
    })
  })

  it("shows the placeholder picture for a product stored with a blank thumbnail", () => {
    expect(toWishlistProduct({ ...row, thumbnail: "" }, "en-US").thumbnail).toBe("https://assets.test/placeholder.svg")
  })

  it("marks a product the shop has withdrawn as no longer available", () => {
    expect(toWishlistProduct({ ...row, status: PRODUCT_STATUS.ARCHIVED }, "en-US").available).toBe(false)
  })
})
