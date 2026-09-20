import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { productZodSchemas } from "~/src/modules/product/product.zod"
import { createProductCompleteFn } from "~/src/modules/product/use-cases/create-complete-product"

const operations = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  attributes: vi.fn(),
  audit: vi.fn(),
  cleanup: vi.fn(),
  images: vi.fn(),
  insert: vi.fn(),
  invalidate: vi.fn(),
  removeOrphan: vi.fn(),
  uuid: vi.fn(),
}))

vi.mock("uuid", () => ({ v7: operations.uuid }))
vi.mock("~/src/integrations/better-auth/auth.assertions", () => ({ assertAdmin: operations.assertAdmin }))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.utils", () => ({ replaceAttributesForProduct: operations.attributes }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordCatalogProductCreatedAudit: operations.audit }))
vi.mock("~/src/modules/product-image/product-image.persist.utils", () => ({ replaceProductImages: operations.images }))
vi.mock("~/src/modules/product/product.accessors", () => ({ deleteProducts: operations.cleanup }))
vi.mock("~/src/modules/product/product.catalog.server", () => ({
  deleteOrphanProductByHandle: operations.removeOrphan,
  insertProductWithCatalog: operations.insert,
}))
vi.mock("~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: operations.invalidate,
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

const productInput = productZodSchemas.createCompleteInput.parse({
  additionalCategoryIds: [],
  attributeValues: [],
  collectionIds: [],
  descriptions: { en: "", pl: "" },
  handle: "silver-ring",
  hasVariants: false,
  images: [{ rank: 0, url: "silver-ring.webp" }],
  options: [],
  primaryCategoryId: "01965030-0000-7000-8000-000000000001",
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120", quantity: 5, sku: "SILVER-RING" },
  status: "draft",
  subtitles: { en: "", pl: "" },
  tags: { en: [], pl: [] },
  titles: { en: "Silver ring", pl: "Srebrny pierścionek" },
  variants: [],
})

describe("complete product creation", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.assertAdmin.mockResolvedValue({ id: "admin" })
    operations.attributes.mockResolvedValue(undefined)
    operations.cleanup.mockResolvedValue(undefined)
    operations.images.mockResolvedValue(undefined)
    operations.insert.mockResolvedValue(undefined)
    operations.removeOrphan.mockResolvedValue(false)
    operations.uuid.mockReturnValueOnce("first-product").mockReturnValueOnce("second-product")
  })

  it("rejects unauthorized calls before touching catalog data", async () => {
    operations.assertAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createProductCompleteFn({ data: productInput })).rejects.toThrow("UNAUTHORIZED")
    expect(operations.removeOrphan).not.toHaveBeenCalled()
    expect(operations.insert).not.toHaveBeenCalled()
    expect(operations.audit).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("audits and invalidates only after all product details are persisted", async () => {
    await expect(createProductCompleteFn({ data: productInput })).resolves.toStrictEqual({ handle: "silver-ring", id: "first-product" })

    expect(operations.images).toHaveBeenCalledWith("first-product", productInput.images)
    expect(operations.attributes).toHaveBeenCalledWith("first-product", productInput.attributeValues)
    expect(operations.audit).toHaveBeenCalledWith("silver-ring", { resourceId: "first-product" })
    expect(operations.invalidate).toHaveBeenCalledTimes(1)
  })

  it("compensates a failed detail write without publishing a successful change", async () => {
    operations.images.mockRejectedValueOnce(new Error("Image write failed"))

    await expect(createProductCompleteFn({ data: productInput })).rejects.toThrow("Image write failed")

    expect(operations.cleanup).toHaveBeenCalledWith(["first-product"])
    expect(operations.insert).toHaveBeenCalledTimes(1)
    expect(operations.audit).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("retries an orphaned handle once and audits the successful replacement", async () => {
    operations.images.mockRejectedValueOnce(new Error("Image write failed"))
    operations.removeOrphan.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    await expect(createProductCompleteFn({ data: productInput })).resolves.toStrictEqual({ handle: "silver-ring", id: "second-product" })

    expect(operations.cleanup).toHaveBeenCalledWith(["first-product"])
    expect(operations.insert).toHaveBeenCalledTimes(2)
    expect(operations.audit).toHaveBeenCalledWith("silver-ring", { resourceId: "second-product" })
    expect(operations.invalidate).toHaveBeenCalledTimes(1)
  })

  it("preserves the mutation error when compensation also fails", async () => {
    operations.images.mockRejectedValueOnce(new Error("Image write failed"))
    operations.cleanup.mockRejectedValueOnce(new Error("Cleanup failed"))

    await expect(createProductCompleteFn({ data: productInput })).rejects.toThrow("Image write failed")

    expect(operations.cleanup).toHaveBeenCalledWith(["first-product"])
    expect(operations.audit).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })
})
