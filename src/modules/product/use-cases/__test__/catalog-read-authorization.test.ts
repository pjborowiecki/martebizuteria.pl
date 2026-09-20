import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fetchByProductIdFn } from "~/src/modules/attribute-on-product/use-cases/get-product-attributes"
import { fetchAdminProductAttributesFn } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import { fetchProductAttributeStatsFn } from "~/src/modules/product-attribute/use-cases/get-product-attribute-stats"
import { fetchAdminCategoriesFn } from "~/src/modules/product-category/use-cases/get-admin-categories"
import { fetchCategoryStatsFn } from "~/src/modules/product-category/use-cases/get-category-stats"
import { fetchAdminCollectionsFn } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { fetchCollectionStatsFn } from "~/src/modules/product-collection/use-cases/get-collection-stats"
import { fetchProductImagesFn } from "~/src/modules/product-image/use-cases/get-product-images"

const access = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  query: vi.fn(() => Promise.resolve([])),
}))

vi.mock("~/src/integrations/better-auth/auth.assertions", () => ({ assertAdmin: access.assertAdmin }))
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
      validator: () => builder,
    }
    return builder
  },
}))

const protectedReads = [
  { name: "category list", queryArgs: [], run: () => fetchAdminCategoriesFn() },
  { name: "category statistics", queryArgs: [], run: () => fetchCategoryStatsFn() },
  { name: "collection list", queryArgs: [], run: () => fetchAdminCollectionsFn() },
  { name: "collection statistics", queryArgs: [], run: () => fetchCollectionStatsFn() },
  { name: "attribute definitions", queryArgs: [], run: () => fetchAdminProductAttributesFn() },
  { name: "attribute statistics", queryArgs: [], run: () => fetchProductAttributeStatsFn() },
  { name: "product attributes", queryArgs: [{ productId: "draft-product" }], run: () => fetchByProductIdFn({ data: "draft-product" }) },
  { name: "product images", queryArgs: [{ productId: "draft-product" }], run: () => fetchProductImagesFn({ data: "draft-product" }) },
]

describe("catalog read authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.assertAdmin.mockResolvedValue({ id: "admin" })
  })

  it.each(protectedReads)("rejects unauthorized $name requests before querying data", async ({ run }) => {
    access.assertAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(run()).rejects.toThrow("UNAUTHORIZED")

    expect(access.query).not.toHaveBeenCalled()
  })

  it.each(protectedReads)("allows administrators to read $name", async ({ queryArgs, run }) => {
    await run()

    expect(access.assertAdmin).toHaveBeenCalledTimes(1)
    expect(access.query).toHaveBeenCalledWith(...queryArgs)
  })
})
