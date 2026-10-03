import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { productZodSchemas } from "~/src/modules/product/product.zod"
import { createCompleteProduct } from "~/src/modules/product/use-cases/create-complete-product"

const operations = vi.hoisted(() => ({
  assertSkus: vi.fn(),
  attributes: vi.fn(),
  audit: vi.fn(),
  authorized: vi.fn(),
  batch: vi.fn<(statements: readonly unknown[]) => Promise<void>>(),
  images: vi.fn(),
  insert: vi.fn(),
  invalidate: vi.fn(),
  loadAttributes: vi.fn(),
  rank: vi.fn(),
  removeOrphan: vi.fn(),
  uuid: vi.fn(),
}))

vi.mock("uuid", () => ({ v7: operations.uuid }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: operations.authorized }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.batch", () => ({ runDrizzleBatch: operations.batch }))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.utils", () => ({
  loadAttributeOnProductRows: operations.loadAttributes,
  prepareAttributeOnProductBatch: operations.attributes,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordCatalogProductCreatedAudit: operations.audit }))
vi.mock("~/src/modules/product-image/product-image.persist.utils", () => ({ prepareProductImagesBatch: operations.images }))
vi.mock("~/src/modules/product/product.catalog.server", () => ({
  assertCatalogSkusAvailable: operations.assertSkus,
  deleteOrphanProductByHandle: operations.removeOrphan,
  getNextProductRank: operations.rank,
  prepareProductInsertBatch: operations.insert,
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: operations.invalidate,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ data: builder.validate(options.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate
        return builder
      },
    }

    return builder
  },
}))

const productInput = productZodSchemas.createCompleteInput.parse({
  additionalCategoryIds: [],
  attributeValues: [],
  collectionIds: [],
  descriptions: { "en-US": "", "pl-PL": "" },
  handle: "silver-ring",
  hasVariants: false,
  images: [{ rank: 0, url: "silver-ring.webp" }],
  options: [],
  primaryCategoryId: "01965030-0000-7000-8000-000000000001",
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120", quantity: 5, sku: "SILVER-RING" },
  status: "draft",
  subtitles: { "en-US": "", "pl-PL": "" },
  tags: { "en-US": [], "pl-PL": [] },
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  variants: [],
})

const firstCallOrder = (mock: { mock: { invocationCallOrder: number[] } }): number => Math.min(...mock.mock.invocationCallOrder)

beforeEach(() => {
  vi.resetAllMocks()
  operations.assertSkus.mockResolvedValue(undefined)
  operations.attributes.mockReturnValue(["attribute statement"])
  operations.batch.mockResolvedValue(undefined)
  operations.images.mockReturnValue(["image statement"])
  operations.insert.mockReturnValue(["product statement"])
  operations.loadAttributes.mockResolvedValue(["attribute row"])
  operations.rank.mockResolvedValue(5)
  operations.removeOrphan.mockResolvedValue(false)
  operations.uuid.mockReturnValue("first-product")
})

describe("complete product creation", () => {
  it("saves the product, its images and its attributes in one atomic batch", async () => {
    await expect(createCompleteProduct({ data: productInput })).resolves.toStrictEqual({ handle: "silver-ring", id: "first-product" })

    expect(operations.insert).toHaveBeenCalledWith("first-product", productInput, 5)
    expect(operations.images).toHaveBeenCalledWith("first-product", productInput.images)
    expect(operations.attributes).toHaveBeenCalledWith("first-product", ["attribute row"])
    expect(operations.batch).toHaveBeenCalledExactlyOnceWith(["product statement", "image statement", "attribute statement"])
  })

  it("audits and invalidates only after the batch is written", async () => {
    await createCompleteProduct({ data: productInput })

    expect(operations.audit).toHaveBeenCalledWith("silver-ring", { resourceId: "first-product" })
    expect(operations.invalidate).toHaveBeenCalledTimes(1)
    expect(firstCallOrder(operations.batch)).toBeLessThan(firstCallOrder(operations.audit))
  })

  it("removes an orphaned handle once, before saving", async () => {
    operations.removeOrphan.mockResolvedValueOnce(true)

    await createCompleteProduct({ data: productInput })

    expect(operations.removeOrphan).toHaveBeenCalledExactlyOnceWith("silver-ring")
    expect(firstCallOrder(operations.removeOrphan)).toBeLessThan(firstCallOrder(operations.batch))
  })
})

describe("complete product creation failures", () => {
  it("writes nothing when a sku is already taken", async () => {
    operations.assertSkus.mockRejectedValueOnce(new Error("DUPLICATE_SKU"))

    await expect(createCompleteProduct({ data: productInput })).rejects.toThrow("DUPLICATE_SKU")

    expect(operations.batch).not.toHaveBeenCalled()
    expect(operations.audit).not.toHaveBeenCalled()
  })

  it("neither audits nor invalidates when the save batch fails", async () => {
    operations.batch.mockRejectedValueOnce(new Error("D1_ERROR: FOREIGN KEY constraint failed"))

    await expect(createCompleteProduct({ data: productInput })).rejects.toThrow("FOREIGN KEY constraint failed")

    expect(operations.audit).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("translates a duplicate handle constraint into the product error code", async () => {
    operations.batch.mockRejectedValueOnce(new Error("UNIQUE constraint failed: product.handle"))

    await expect(createCompleteProduct({ data: productInput })).rejects.toThrow("DUPLICATE_HANDLE")
  })
})
