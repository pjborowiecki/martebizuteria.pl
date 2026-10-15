import { describe, expect, it } from "vite-plus/test"

import {
  type VariantWithInventory,
  getVariantQuantityAvailable,
  isProductInStock,
  isVariantPurchasable,
  quantitiesBeyond,
  resolveProductTotalAvailableStock,
  sumHeldQuantity,
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

describe("sumHeldQuantity", () => {
  it("adds up every held line of the variant and ignores the others", () => {
    expect(
      sumHeldQuantity(
        [
          { qty: 1, variantId: "a" },
          { qty: 2, variantId: "b" },
          { qty: 3, variantId: "a" },
        ],
        "a",
      ),
    ).toBe(4)
  })

  it("is zero when nothing of the variant is held", () => {
    expect(sumHeldQuantity([{ qty: 2, variantId: "b" }], "a")).toBe(0)
    expect(sumHeldQuantity([], "a")).toBe(0)
  })
})

describe("quantitiesBeyond", () => {
  it("keeps of each line only the units the baseline does not already cover", () => {
    expect(
      quantitiesBeyond(
        [
          { qty: 3, variantId: "a" },
          { qty: 1, variantId: "b" },
          { qty: 2, variantId: "c" },
        ],
        [
          { qty: 1, variantId: "a" },
          { qty: 1, variantId: "b" },
          { qty: 4, variantId: "c" },
        ],
      ),
    ).toStrictEqual([{ qty: 2, variantId: "a" }])
  })

  it("keeps a whole line whose variant the baseline does not hold", () => {
    expect(quantitiesBeyond([{ qty: 2, variantId: "a" }], [{ qty: 2, variantId: "b" }])).toStrictEqual([{ qty: 2, variantId: "a" }])
    expect(quantitiesBeyond([{ qty: 2, variantId: "a" }], [])).toStrictEqual([{ qty: 2, variantId: "a" }])
  })

  it("spends the baseline of a variant once across several lines of it", () => {
    expect(
      quantitiesBeyond(
        [
          { qty: 2, variantId: "a" },
          { qty: 2, variantId: "a" },
          { qty: 1, variantId: "a" },
        ],
        [
          { qty: 1, variantId: "a" },
          { qty: 2, variantId: "a" },
        ],
      ),
    ).toStrictEqual([
      { qty: 1, variantId: "a" },
      { qty: 1, variantId: "a" },
    ])
  })

  it("carries every other field of the line it shortens", () => {
    expect(
      quantitiesBeyond([{ inventoryId: "inventory-a", qty: 3, title: "Ring", variantId: "a" }], [{ qty: 1, variantId: "a" }]),
    ).toStrictEqual([{ inventoryId: "inventory-a", qty: 2, title: "Ring", variantId: "a" }])
  })
})
