import { describe, expect, it } from "vite-plus/test"

import {
  type VariantWithInventory,
  getVariantQuantityAvailable,
  isProductInStock,
  isVariantPurchasable,
  resolveProductTotalAvailableStock,
} from "~/src/modules/inventory/inventory.availability.utils"

const variant = (quantityAvailable: number | undefined, id = "variant-1"): VariantWithInventory => ({
  barcode: null,
  compareAtPrice: null,
  createdAt: new Date(2024, 0, 1),
  id,
  inventory:
    quantityAvailable === undefined
      ? null
      : {
          createdAt: new Date(2024, 0, 1),
          id: `inventory-${id}`,
          quantityAvailable,
          quantityReserved: 0,
          updatedAt: new Date(2024, 0, 1),
          variantId: id,
          version: 1,
        },
  manageInventory: true,
  metadata: null,
  price: 12_000,
  productId: "product-1",
  sku: null,
  title: "Default",
  updatedAt: new Date(2024, 0, 1),
})

describe("getVariantQuantityAvailable", () => {
  it("reads the joined inventory row", () => {
    expect(getVariantQuantityAvailable(variant(4))).toBe(4)
  })

  it("treats a variant with no inventory row as out of stock rather than unlimited", () => {
    expect(getVariantQuantityAvailable(variant(undefined))).toBe(0)
    expect(getVariantQuantityAvailable(undefined)).toBe(0)
  })
})

describe("isVariantPurchasable", () => {
  it("allows a quantity up to the available stock", () => {
    expect(isVariantPurchasable(variant(4), 1)).toBe(true)
    expect(isVariantPurchasable(variant(4), 4)).toBe(true)
  })

  it("refuses to oversell", () => {
    expect(isVariantPurchasable(variant(4), 5)).toBe(false)
    expect(isVariantPurchasable(variant(0), 1)).toBe(false)
  })

  it.each([[0], [-1]])("refuses the non-positive quantity %i", (quantity) => {
    expect(isVariantPurchasable(variant(4), quantity)).toBe(false)
  })

  it("refuses a variant that was never loaded", () => {
    expect(isVariantPurchasable(undefined, 1)).toBe(false)
  })
})

describe("resolveProductTotalAvailableStock", () => {
  it("sums availability across the product's variants", () => {
    expect(resolveProductTotalAvailableStock([variant(4, "a"), variant(3, "b"), variant(undefined, "c")])).toBe(7)
  })

  it("is zero for a product with no variants", () => {
    expect(resolveProductTotalAvailableStock([])).toBe(0)
  })
})

describe("isProductInStock", () => {
  it("is in stock when any variant has availability", () => {
    expect(isProductInStock([variant(0, "a"), variant(1, "b")])).toBe(true)
  })

  it("is out of stock when every variant is empty or unlinked", () => {
    expect(isProductInStock([variant(0, "a"), variant(undefined, "b")])).toBe(false)
    expect(isProductInStock([])).toBe(false)
  })
})
