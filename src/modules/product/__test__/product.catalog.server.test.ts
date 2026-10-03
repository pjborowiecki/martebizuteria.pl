import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  assertCatalogSkusAvailable,
  deleteOrphanProductByHandle,
  getNextProductRank,
  prepareProductInsertBatch,
  prepareProductUpdateBatch,
} from "~/src/modules/product/product.catalog.server"
import { type ProductCatalogReplacePayload, type ProductOrganizationReplacePayload } from "~/src/modules/product/product.utils"
import { productZodSchemas } from "~/src/modules/product/product.zod"

const database = vi.hoisted(() => ({
  insert: vi.fn<(row: Record<string, unknown>) => void>(),
  update: vi.fn<(values: Record<string, unknown>, condition: unknown) => void>(),
}))

const access = vi.hoisted(() => ({
  byHandle: vi.fn(),
  maxRank: vi.fn(),
}))

const mutations = vi.hoisted(() => ({
  deleteProducts: vi.fn<(ids: readonly string[]) => Promise<void>>(),
  findTakenSkus: vi.fn<(skus: readonly string[], productId?: string) => Promise<string[]>>(),
  prepareCatalog: vi.fn<(productId: string, payload: ProductCatalogReplacePayload) => string[]>(),
  prepareOrganization: vi.fn<(productId: string, payload: ProductOrganizationReplacePayload) => string[]>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    insert: () => ({
      values: (row: Record<string, unknown>) => {
        database.insert(row)

        return "insert product"
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (condition: unknown) => {
          database.update(values, condition)

          return "update product"
        },
      }),
    }),
  },
}))

vi.mock("~/src/modules/product/product.accessors", () => ({
  getMaxRankQuery: { execute: access.maxRank },
  getProductByHandleQuery: { execute: access.byHandle },
}))

vi.mock("~/src/modules/product/product.mutations", () => ({
  deleteProducts: mutations.deleteProducts,
  findTakenSkus: mutations.findTakenSkus,
  prepareProductCatalogBatch: mutations.prepareCatalog,
  prepareProductOrganizationBatch: mutations.prepareOrganization,
}))

const CATEGORY_ID = "01965030-0000-7000-8000-000000000001"

const catalogInput = (overrides: Record<string, unknown> = {}) =>
  productZodSchemas.catalogUpsertInput.parse({
    additionalCategoryIds: [],
    collectionIds: [],
    descriptions: { "en-US": "", "pl-PL": "" },
    handle: "silver-ring",
    hasVariants: false,
    options: [],
    primaryCategoryId: CATEGORY_ID,
    simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120", quantity: 5, sku: " SILVER-RING " },
    status: "draft",
    subtitles: { "en-US": " Handmade ", "pl-PL": "" },
    tags: { "en-US": [" gift "], "pl-PL": [] },
    titles: { "en-US": " Silver ring ", "pl-PL": "Srebrny pierscionek" },
    variants: [],
    ...overrides,
  })

beforeEach(() => {
  vi.resetAllMocks()
  mutations.findTakenSkus.mockResolvedValue([])
  access.maxRank.mockResolvedValue([{ value: 4 }])
  mutations.prepareCatalog.mockReturnValue(["catalog statement"])
  mutations.prepareOrganization.mockReturnValue(["organization statement"])
})

describe("assertCatalogSkusAvailable", () => {
  it("passes the collected skus and the edited product to the lookup", async () => {
    await assertCatalogSkusAvailable(catalogInput(), "product-1")

    expect(mutations.findTakenSkus).toHaveBeenCalledWith(["SILVER-RING"], "product-1")
  })

  it("accepts a catalog whose skus are free", async () => {
    await expect(assertCatalogSkusAvailable(catalogInput())).resolves.toBeUndefined()
  })

  it("rejects a catalog with a taken sku", async () => {
    mutations.findTakenSkus.mockResolvedValue(["SILVER-RING"])

    await expect(assertCatalogSkusAvailable(catalogInput())).rejects.toThrow("DUPLICATE_SKU")
  })
})

describe("deleteOrphanProductByHandle", () => {
  it("reports nothing to clean up when the handle is free", async () => {
    access.byHandle.mockResolvedValue(undefined)

    await expect(deleteOrphanProductByHandle("silver-ring")).resolves.toBe(false)
    expect(access.byHandle).toHaveBeenCalledWith({ handle: "silver-ring" })
    expect(mutations.deleteProducts).not.toHaveBeenCalled()
  })

  it("keeps a product that already has variants", async () => {
    access.byHandle.mockResolvedValue({ id: "product-1", variants: [{ id: "variant-1" }] })

    await expect(deleteOrphanProductByHandle("silver-ring")).resolves.toBe(false)
    expect(mutations.deleteProducts).not.toHaveBeenCalled()
  })

  it("deletes a product left behind without variants", async () => {
    access.byHandle.mockResolvedValue({ id: "product-1", variants: [] })

    await expect(deleteOrphanProductByHandle("silver-ring")).resolves.toBe(true)
    expect(mutations.deleteProducts).toHaveBeenCalledWith(["product-1"])
  })
})

describe("getNextProductRank", () => {
  it("continues after the highest rank", async () => {
    await expect(getNextProductRank()).resolves.toBe(5)
  })

  it("starts the ranking at zero for the first product", async () => {
    access.maxRank.mockResolvedValue([])

    await expect(getNextProductRank()).resolves.toBe(0)
  })
})

describe("prepareProductInsertBatch", () => {
  it("writes the normalized product row at the given rank", () => {
    prepareProductInsertBatch("product-1", catalogInput(), 5)

    expect(database.insert).toHaveBeenCalledWith({
      descriptions: undefined,
      handle: "silver-ring",
      id: "product-1",
      rank: 5,
      status: "draft",
      subtitles: { "en-US": "Handmade", "pl-PL": "" },
      tags: { "en-US": ["gift"], "pl-PL": [] },
      titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
    })
  })

  it("maps an active product onto the published database status", () => {
    prepareProductInsertBatch("product-1", catalogInput({ status: "active" }), 5)

    expect(database.insert.mock.calls[0]?.[0]).toMatchObject({ status: "published" })
  })

  it("inserts the product before its organization and catalog rows", () => {
    expect(prepareProductInsertBatch("product-1", catalogInput(), 5)).toStrictEqual([
      "insert product",
      "organization statement",
      "catalog statement",
    ])
    expect(mutations.prepareOrganization.mock.calls[0]?.[0]).toBe("product-1")
  })

  it("leaves the organization out when no primary category is chosen", () => {
    expect(prepareProductInsertBatch("product-1", { ...catalogInput(), primaryCategoryId: "" }, 5)).toStrictEqual([
      "insert product",
      "catalog statement",
    ])
    expect(mutations.prepareOrganization).not.toHaveBeenCalled()
  })

  it("persists the simple variant as a single catalog variant row", () => {
    prepareProductInsertBatch("product-1", catalogInput(), 5)

    const payload = mutations.prepareCatalog.mock.calls[0]?.[1]

    expect(payload).toMatchObject({ optionRows: [], optionValueRows: [] })
    expect(payload?.variantRows).toHaveLength(1)
    expect(payload?.variantRows[0]).toMatchObject({ price: 12_000, productId: "product-1", sku: "SILVER-RING" })
    expect(payload?.inventoryRows[0]).toMatchObject({ quantityAvailable: 5, quantityReserved: 0 })
  })
})

describe("prepareProductUpdateBatch", () => {
  it("updates only the catalog level columns of the product", () => {
    prepareProductUpdateBatch("product-1", catalogInput(), new Set())

    expect(database.update.mock.calls[0]?.[0]).toStrictEqual({
      descriptions: undefined,
      handle: "silver-ring",
      status: "draft",
      subtitles: { "en-US": "Handmade", "pl-PL": "" },
      tags: { "en-US": ["gift"], "pl-PL": [] },
      titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
    })
  })

  it("drops empty descriptions instead of storing blank locales", () => {
    prepareProductUpdateBatch("product-1", catalogInput({ descriptions: { "en-US": "  ", "pl-PL": "" } }), new Set())

    expect(database.update.mock.calls[0]?.[0]).toMatchObject({ descriptions: undefined })
  })

  it("keeps a description that has content in one locale", () => {
    prepareProductUpdateBatch("product-1", catalogInput({ descriptions: { "en-US": " Sterling silver ", "pl-PL": "" } }), new Set())

    expect(database.update.mock.calls[0]?.[0]).toMatchObject({
      descriptions: { "en-US": "Sterling silver", "pl-PL": "" },
    })
  })

  it("updates the product before replacing its organization and catalog rows", () => {
    expect(prepareProductUpdateBatch("product-1", catalogInput(), new Set())).toStrictEqual([
      "update product",
      "organization statement",
      "catalog statement",
    ])
    expect(mutations.prepareCatalog.mock.calls[0]?.[0]).toBe("product-1")
  })

  it("does not re-check skus while preparing the update", () => {
    prepareProductUpdateBatch("product-1", catalogInput(), new Set())

    expect(mutations.findTakenSkus).not.toHaveBeenCalled()
  })
})
