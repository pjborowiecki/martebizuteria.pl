import { describe, expect, it } from "vite-plus/test"

import { buildCollectionOnProductRows, resolveCollectionIds } from "~/src/modules/collection-on-product/collection-on-product.utils"

describe("resolveCollectionIds", () => {
  it("keeps the stored assignment order", () => {
    expect(resolveCollectionIds([{ collectionId: "col-b" }, { collectionId: "col-a" }])).toStrictEqual(["col-b", "col-a"])
  })

  it("is empty for a product in no collection", () => {
    expect(resolveCollectionIds([])).toStrictEqual([])
  })
})

describe("buildCollectionOnProductRows", () => {
  it("ranks the collections in the order they were chosen", () => {
    expect(buildCollectionOnProductRows("product-1", ["col-b", "col-a"])).toStrictEqual([
      { collectionId: "col-b", productId: "product-1", rank: 0 },
      { collectionId: "col-a", productId: "product-1", rank: 1 },
    ])
  })

  it("de-duplicates while keeping the first position of each collection", () => {
    expect(buildCollectionOnProductRows("product-1", ["col-b", "col-a", "col-b"]).map((row) => [row.collectionId, row.rank])).toStrictEqual(
      [
        ["col-b", 0],
        ["col-a", 1],
      ],
    )
  })

  it("produces nothing when no collection was chosen", () => {
    expect(buildCollectionOnProductRows("product-1", [])).toStrictEqual([])
  })

  it("round trips through the resolver", () => {
    expect(resolveCollectionIds(buildCollectionOnProductRows("product-1", ["col-b", "col-a"]))).toStrictEqual(["col-b", "col-a"])
  })
})
