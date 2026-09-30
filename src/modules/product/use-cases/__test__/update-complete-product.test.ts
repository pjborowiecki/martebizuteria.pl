import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { productZodSchemas } from "~/src/modules/product/product.zod"
import { updateCompleteProduct } from "~/src/modules/product/use-cases/update-complete-product"

interface AuditPayload {
  readonly detail?: string | undefined
  readonly metadata?: Record<string, unknown> | undefined
  readonly resourceId: string
}

const operations = vi.hoisted(() => ({
  assertSkus: vi.fn(),
  attributes: vi.fn(),
  audit: vi.fn<(handle: string, payload: AuditPayload) => void>(),
  authorized: vi.fn(),
  detailById: vi.fn<(input: { readonly id: string }) => Promise<unknown>>(),
  images: vi.fn(),
  invalidate: vi.fn(),
  productByHandle: vi.fn(),
  update: vi.fn<(id: string, input: Record<string, unknown>) => Promise<void>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: operations.authorized }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: operations.invalidate,
}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.utils", () => ({
  replaceAllAttributesForProduct: operations.attributes,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordCatalogProductUpdatedAudit: operations.audit }))
vi.mock("~/src/modules/product-image/product-image.persist.utils", () => ({ replaceProductImages: operations.images }))
vi.mock("~/src/modules/product/product.accessors", () => ({
  getAdminProductDetailByIdQuery: { execute: operations.detailById },
  getProductByHandleQuery: { execute: operations.productByHandle },
}))
vi.mock("~/src/modules/product/product.catalog.server", () => ({
  assertCatalogSkusAvailable: operations.assertSkus,
  updateProductWithCatalog: operations.update,
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

const PRODUCT_ID = "01965030-0000-7000-8000-0000000000aa"

const productInput = productZodSchemas.updateCompleteInput.parse({
  additionalCategoryIds: [],
  attributeValues: [{ attributeId: "01965030-0000-7000-8000-000000000011", value: "silver" }],
  collectionIds: [],
  descriptions: { "en-US": "", "pl-PL": "" },
  handle: "silver-ring",
  hasVariants: false,
  id: PRODUCT_ID,
  images: [{ rank: 0, url: "silver-ring.webp" }],
  options: [],
  primaryCategoryId: "01965030-0000-7000-8000-000000000001",
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120", quantity: 5, sku: "SILVER-RING" },
  status: "draft",
  subtitles: { "en-US": "", "pl-PL": "" },
  tags: { "en-US": [], "pl-PL": [] },
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  variantAttributeValues: [{ values: [{ attributeId: "01965030-0000-7000-8000-000000000012", value: "54" }], variantId: "variant-1" }],
  variants: [],
})

const detail = (status: string, quantityAvailable: number) => ({
  status,
  variants: [{ inventory: { quantityAvailable }, price: 12_000, sku: "SILVER-RING" }],
})

const auditPayload = (): AuditPayload | undefined => operations.audit.mock.calls[0]?.[1]

beforeEach(() => {
  vi.resetAllMocks()
  operations.assertSkus.mockResolvedValue(undefined)
  operations.attributes.mockResolvedValue(undefined)
  operations.images.mockResolvedValue(undefined)
  operations.productByHandle.mockResolvedValue(undefined)
  operations.update.mockResolvedValue(undefined)
  operations.detailById.mockResolvedValue(detail("draft", 5))
})

describe("complete product update", () => {
  it("returns the handle and id it persisted under", async () => {
    await expect(updateCompleteProduct({ data: productInput })).resolves.toStrictEqual({ handle: "silver-ring", id: PRODUCT_ID })
  })

  it("leaves the catalog row alone when a sku is already taken", async () => {
    operations.assertSkus.mockRejectedValueOnce(new Error("Sku taken"))

    await expect(updateCompleteProduct({ data: productInput })).rejects.toThrow("Sku taken")

    expect(operations.update).not.toHaveBeenCalled()
    expect(operations.images).not.toHaveBeenCalled()
  })

  it("writes the catalog row without the detail collections it handles separately", async () => {
    await updateCompleteProduct({ data: productInput })

    const catalogInput = operations.update.mock.calls[0]?.[1]

    expect(operations.update.mock.calls[0]?.[0]).toBe(PRODUCT_ID)
    expect(catalogInput).not.toHaveProperty("images")
    expect(catalogInput).not.toHaveProperty("attributeValues")
    expect(catalogInput).not.toHaveProperty("variantAttributeValues")
    expect(catalogInput).not.toHaveProperty("id")
    expect(catalogInput).toMatchObject({ handle: "silver-ring", status: "draft" })
  })

  it("replaces the image set for the product", async () => {
    await updateCompleteProduct({ data: productInput })

    expect(operations.images).toHaveBeenCalledWith(PRODUCT_ID, productInput.images)
  })

  it("reshapes variant attribute groups into rows for the attribute writer", async () => {
    await updateCompleteProduct({ data: productInput })

    expect(operations.attributes).toHaveBeenCalledWith(PRODUCT_ID, productInput.attributeValues, [
      { rows: [{ attributeId: "01965030-0000-7000-8000-000000000012", value: "54" }], variantId: "variant-1" },
    ])
  })

  it("invalidates the storefront catalog once the writes are done", async () => {
    await updateCompleteProduct({ data: productInput })

    expect(operations.invalidate).toHaveBeenCalledTimes(1)
  })
})

describe("complete product update auditing", () => {
  it("records the snapshot fields that moved", async () => {
    operations.detailById.mockResolvedValueOnce(detail("draft", 5)).mockResolvedValueOnce(detail("published", 2))

    await updateCompleteProduct({ data: productInput })

    expect(operations.audit.mock.calls[0]?.[0]).toBe("silver-ring")
    expect(auditPayload()).toMatchObject({
      metadata: {
        changed: ["status", "totalStock", "variants"],
        new: { status: "published", totalStock: 2, variants: [{ price: 12_000, quantity: 2, sku: "SILVER-RING" }] },
        old: { status: "draft", totalStock: 5, variants: [{ price: 12_000, quantity: 5, sku: "SILVER-RING" }] },
      },
      resourceId: PRODUCT_ID,
    })
  })

  it("spells the status and stock move out for the reader", async () => {
    operations.detailById.mockResolvedValueOnce(detail("draft", 5)).mockResolvedValueOnce(detail("published", 2))

    await updateCompleteProduct({ data: productInput })
    const text = auditPayload()?.detail ?? ""

    expect(text).toContain("Status: draft → published")
    expect(text).toContain("Stock: 5 → 2")
    expect(text).toContain("Variants updated")
  })

  it("mentions only the variants when just a price moved", async () => {
    operations.detailById
      .mockResolvedValueOnce(detail("draft", 5))
      .mockResolvedValueOnce({ status: "draft", variants: [{ inventory: { quantityAvailable: 5 }, price: 15_000, sku: "SILVER-RING" }] })

    await updateCompleteProduct({ data: productInput })

    expect(auditPayload()?.detail).toContain("Variants updated")
    expect(auditPayload()?.metadata?.["changed"]).toStrictEqual(["variants"])
  })

  it("records the update with no diff when nothing about the product moved", async () => {
    await updateCompleteProduct({ data: productInput })

    expect(operations.audit).toHaveBeenCalledWith("silver-ring", { detail: undefined, metadata: undefined, resourceId: PRODUCT_ID })
  })

  it("records the update with no diff when the product cannot be read back", async () => {
    operations.detailById.mockResolvedValueOnce(detail("draft", 5)).mockResolvedValueOnce(undefined)

    await updateCompleteProduct({ data: productInput })

    expect(operations.audit).toHaveBeenCalledWith("silver-ring", { detail: undefined, metadata: undefined, resourceId: PRODUCT_ID })
  })

  it("records the update with no diff when there was no snapshot to compare against", async () => {
    operations.detailById.mockResolvedValueOnce(undefined).mockResolvedValueOnce(detail("published", 9))

    await updateCompleteProduct({ data: productInput })

    expect(operations.audit).toHaveBeenCalledWith("silver-ring", { detail: undefined, metadata: undefined, resourceId: PRODUCT_ID })
  })
})

describe("complete product update failures", () => {
  it("refuses a handle that already belongs to another product", async () => {
    operations.productByHandle.mockResolvedValue({ id: "another-product" })

    await expect(updateCompleteProduct({ data: productInput })).rejects.toThrow("DUPLICATE_HANDLE")

    expect(operations.update).not.toHaveBeenCalled()
    expect(operations.audit).not.toHaveBeenCalled()
  })

  it("keeps the handle the product already owns", async () => {
    operations.productByHandle.mockResolvedValue({ id: PRODUCT_ID })

    await expect(updateCompleteProduct({ data: productInput })).resolves.toStrictEqual({ handle: "silver-ring", id: PRODUCT_ID })
  })

  it("neither audits nor invalidates when the image write fails", async () => {
    operations.images.mockRejectedValueOnce(new Error("Image write failed"))

    await expect(updateCompleteProduct({ data: productInput })).rejects.toThrow("Image write failed")

    expect(operations.audit).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("neither audits nor invalidates when the attribute write fails", async () => {
    operations.attributes.mockRejectedValueOnce(new Error("Attribute write failed"))

    await expect(updateCompleteProduct({ data: productInput })).rejects.toThrow("Attribute write failed")

    expect(operations.audit).not.toHaveBeenCalled()
  })

  it("translates a duplicate sku constraint into the product error code", async () => {
    operations.update.mockRejectedValueOnce(new Error("UNIQUE constraint failed: product_variant.sku"))

    await expect(updateCompleteProduct({ data: productInput })).rejects.toThrow("DUPLICATE_SKU")
  })

  it("translates a duplicate handle constraint into the product error code", async () => {
    operations.update.mockRejectedValueOnce(new Error("UNIQUE constraint failed: product.handle"))

    await expect(updateCompleteProduct({ data: productInput })).rejects.toThrow("DUPLICATE_HANDLE")
  })
})
