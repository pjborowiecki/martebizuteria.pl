import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { productZodSchemas } from "~/src/modules/product/product.zod"
import { createCompleteProduct } from "~/src/modules/product/use-cases/create-complete-product"

const operations = vi.hoisted(() => ({
  attributes: vi.fn(),
  audit: vi.fn(),
  authorized: vi.fn(),
  cleanup: vi.fn(),
  images: vi.fn(),
  insert: vi.fn(),
  invalidate: vi.fn(),
  removeOrphan: vi.fn(),
  uuid: vi.fn(),
}))

vi.mock("uuid", () => ({ v7: operations.uuid }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: operations.authorized }))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.utils", () => ({ replaceAttributesForProduct: operations.attributes }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordCatalogProductCreatedAudit: operations.audit }))
vi.mock("~/src/modules/product-image/product-image.persist.utils", () => ({ replaceProductImages: operations.images }))
vi.mock("~/src/modules/product/product.mutations", () => ({ deleteProducts: operations.cleanup }))
vi.mock("~/src/modules/product/product.catalog.server", () => ({
  deleteOrphanProductByHandle: operations.removeOrphan,
  insertProductWithCatalog: operations.insert,
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

describe("complete product creation", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.attributes.mockResolvedValue(undefined)
    operations.cleanup.mockResolvedValue(undefined)
    operations.images.mockResolvedValue(undefined)
    operations.insert.mockResolvedValue(undefined)
    operations.removeOrphan.mockResolvedValue(false)
    operations.uuid.mockReturnValue("first-product")
  })

  it("audits and invalidates only after all product details are persisted", async () => {
    await expect(createCompleteProduct({ data: productInput })).resolves.toStrictEqual({ handle: "silver-ring", id: "first-product" })

    expect(operations.images).toHaveBeenCalledWith("first-product", productInput.images)
    expect(operations.attributes).toHaveBeenCalledWith("first-product", productInput.attributeValues)
    expect(operations.audit).toHaveBeenCalledWith("silver-ring", { resourceId: "first-product" })
    expect(operations.invalidate).toHaveBeenCalledTimes(1)
  })

  it("compensates a failed detail write without publishing a successful change", async () => {
    operations.images.mockRejectedValueOnce(new Error("Image write failed"))

    await expect(createCompleteProduct({ data: productInput })).rejects.toThrow("Image write failed")

    expect(operations.cleanup).toHaveBeenCalledWith(["first-product"])
    expect(operations.insert).toHaveBeenCalledTimes(1)
    expect(operations.audit).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("removes an orphaned handle once, before the single insert attempt", async () => {
    operations.images.mockRejectedValueOnce(new Error("Image write failed"))
    operations.removeOrphan.mockResolvedValueOnce(true)

    await expect(createCompleteProduct({ data: productInput })).rejects.toThrow("Image write failed")

    expect(operations.removeOrphan).toHaveBeenCalledTimes(1)
    expect(operations.insert).toHaveBeenCalledTimes(1)
    expect(operations.audit).not.toHaveBeenCalled()
  })

  it("preserves the mutation error when compensation also fails", async () => {
    operations.images.mockRejectedValueOnce(new Error("Image write failed"))
    operations.cleanup.mockRejectedValueOnce(new Error("Cleanup failed"))

    await expect(createCompleteProduct({ data: productInput })).rejects.toThrow("Image write failed")

    expect(operations.cleanup).toHaveBeenCalledWith(["first-product"])
    expect(operations.audit).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })
})
