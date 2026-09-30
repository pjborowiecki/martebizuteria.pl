import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getProductAttributes } from "~/src/modules/attribute-on-product/use-cases/get-product-attributes"
import { getAdminProductAttributes } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import { getProductAttributeStats } from "~/src/modules/product-attribute/use-cases/get-product-attribute-stats"
import { getAdminCategories } from "~/src/modules/product-category/use-cases/get-admin-categories"
import { getCategoryStats } from "~/src/modules/product-category/use-cases/get-category-stats"
import { getAdminCollections } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { getCollectionStats } from "~/src/modules/product-collection/use-cases/get-collection-stats"
import { getProductImages } from "~/src/modules/product-image/use-cases/get-product-images"

const access = vi.hoisted(() => ({
  query: vi.fn(() => Promise.resolve([])),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/product-category/product-category.server", () => ({
  getAdminCategoriesQuery: { execute: access.query },
  getCategoryStatusCountsQuery: { execute: access.query },
}))
vi.mock("~/src/modules/category-on-product/category-on-product.accessors", () => ({
  getCategoryProductTotalQuery: { execute: access.query },
  getProductCountsQuery: { execute: access.query },
}))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  getAdminCollectionsQuery: { execute: access.query },
  getCollectionStatusCountsQuery: { execute: access.query },
}))
vi.mock("~/src/modules/collection-on-product/collection-on-product.accessors", () => ({
  getCollectionProductTotalQuery: { execute: access.query },
  getProductCountsQuery: { execute: access.query },
}))
vi.mock("~/src/modules/product-attribute/product-attribute.server", () => ({
  getAdminProductAttributeListItems: access.query,
}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({
  getByProductIdQuery: { execute: access.query },
}))
vi.mock("~/src/modules/product-image/product-image.server", () => ({
  getProductImagesQuery: { execute: access.query },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: unknown) => handler,
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const adminReads = [
  { name: "category list", queryArgs: [], run: () => getAdminCategories() },
  { name: "category statistics", queryArgs: [], run: () => getCategoryStats() },
  { name: "collection list", queryArgs: [], run: () => getAdminCollections() },
  { name: "collection statistics", queryArgs: [], run: () => getCollectionStats() },
  { name: "attribute definitions", queryArgs: [], run: () => getAdminProductAttributes() },
  { name: "attribute statistics", queryArgs: [], run: () => getProductAttributeStats() },
  { name: "product attributes", queryArgs: [{ productId: "draft-product" }], run: () => getProductAttributes({ data: "draft-product" }) },
  { name: "product images", queryArgs: [{ productId: "draft-product" }], run: () => getProductImages({ data: "draft-product" }) },
]

describe("catalog admin reads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(adminReads)("reads $name straight from the catalog accessors", async ({ queryArgs, run }) => {
    await run()

    expect(access.query).toHaveBeenCalledWith(...queryArgs)
  })
})
