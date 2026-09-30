import { describe, expect, it } from "vite-plus/test"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import {
  flattenStorefrontCategoryFilters,
  mapStorefrontCollectionFilters,
} from "~/src/presentation/components/custom/pages/products-catalog/products-catalog.utils"

const EPOCH = new Date(0)

const category = (
  id: string,
  titles: Partial<Record<"en-US" | "pl-PL", string>>,
  children?: readonly ProductCategory["select"][],
): ProductCategory["select"] & { readonly children?: readonly ProductCategory["select"][] } => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: `${id}-handle`,
  id,
  image: null,
  metadata: null,
  parentId: null,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": titles["en-US"] ?? "", "pl-PL": titles["pl-PL"] ?? "" },
  updatedAt: EPOCH,
  ...(children === undefined ? {} : { children }),
})

const collection = (id: string, titles: Partial<Record<"en-US" | "pl-PL", string>>): ProductCollection["select"] => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: `${id}-handle`,
  id,
  image: null,
  metadata: null,
  rank: 0,
  status: "active",
  titles: { "en-US": titles["en-US"] ?? "", "pl-PL": titles["pl-PL"] ?? "" },
  updatedAt: EPOCH,
})

describe("flattenStorefrontCategoryFilters", () => {
  it("returns nothing for an empty tree", () => {
    expect(flattenStorefrontCategoryFilters([], "en-US")).toStrictEqual([])
  })

  it("emits a root category at depth zero with its handle and id", () => {
    expect(flattenStorefrontCategoryFilters([category("rings", { "en-US": "Rings" })], "en-US")).toStrictEqual([
      { depth: 0, handle: "rings-handle", id: "rings", title: "Rings" },
    ])
  })

  it("walks children depth first and increments the depth per level", () => {
    const tree = [
      category("jewellery", { "en-US": "Jewellery" }, [
        category("rings", { "en-US": "Rings" }),
        category("necklaces", { "en-US": "Necklaces" }),
      ]),
      category("watches", { "en-US": "Watches" }),
    ]

    expect(flattenStorefrontCategoryFilters(tree, "en-US").map((option) => [option.id, option.depth])).toStrictEqual([
      ["jewellery", 0],
      ["rings", 1],
      ["necklaces", 1],
      ["watches", 0],
    ])
  })

  it("treats a category with an empty children array as a leaf", () => {
    expect(flattenStorefrontCategoryFilters([category("rings", { "en-US": "Rings" }, [])], "en-US")).toHaveLength(1)
  })

  it("resolves the title for the requested locale", () => {
    const tree = [category("rings", { "en-US": "Rings", "pl-PL": "Pierscionki" })]

    expect(flattenStorefrontCategoryFilters(tree, "pl-PL")[0]?.title).toBe("Pierscionki")
  })

  it("falls back to the default locale title when the requested locale is blank", () => {
    const tree = [category("rings", { "pl-PL": "Pierscionki" })]

    expect(flattenStorefrontCategoryFilters(tree, "en-US")[0]?.title).toBe("Pierscionki")
  })

  it("falls back to the default locale title for an unsupported locale", () => {
    const tree = [category("rings", { "en-US": "Rings", "pl-PL": "Pierscionki" })]

    expect(flattenStorefrontCategoryFilters(tree, "fr-FR")[0]?.title).toBe("Pierscionki")
  })

  it("yields an empty title when no locale carries one", () => {
    expect(flattenStorefrontCategoryFilters([category("rings", {})], "en-US")[0]?.title).toBe("")
  })
})

describe("mapStorefrontCollectionFilters", () => {
  it("returns nothing for an empty list", () => {
    expect(mapStorefrontCollectionFilters([], "en-US")).toStrictEqual([])
  })

  it("keeps the source order and exposes handle, id and localized title", () => {
    const collections = [collection("new", { "en-US": "New arrivals" }), collection("sale", { "en-US": "Sale", "pl-PL": "Wyprzedaz" })]

    expect(mapStorefrontCollectionFilters(collections, "pl-PL")).toStrictEqual([
      { handle: "new-handle", id: "new", title: "New arrivals" },
      { handle: "sale-handle", id: "sale", title: "Wyprzedaz" },
    ])
  })
})
