import { describe, expect, it } from "vite-plus/test"

import {
  PRODUCT_ADMIN_STATUS,
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_STATUS,
  PRODUCT_VARIANT_KIND,
} from "~/src/modules/product/product.constants"
import {
  buildSkuSummaryByProductId,
  buildVariantStatsByProductId,
  coerceProductLocaleMap,
  coerceProductTagsLocaleMap,
  createEmptyProductTagsLocaleMap,
  normalizeOptionalProductLocaleMapForSave,
  normalizeProductTagsLocaleMapForSave,
  prepareCatalogReplacePayload,
  prepareOrganizationReplacePayload,
  resolveProductDescription,
  resolveProductInventoryLevel,
  resolveProductSubtitle,
  resolveProductTags,
  resolveProductTitle,
  resolveProductVariantKind,
  toProductAdminStatus,
  toProductDbStatus,
} from "~/src/modules/product/product.utils"
import { type CatalogUpsertInput } from "~/src/modules/product/product.zod"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const PRIMARY_CATEGORY_ID = "0195b6f4-0000-7000-8000-000000000001"

const EXTRA_CATEGORY_ID = "0195b6f4-0000-7000-8000-000000000002"

const COLLECTION_ID = "0195b6f4-0000-7000-8000-000000000003"

const OPTION_ID = "0195b6f4-0000-7000-8000-000000000011"

const SMALL_VALUE_ID = "0195b6f4-0000-7000-8000-000000000012"

const LARGE_VALUE_ID = "0195b6f4-0000-7000-8000-000000000013"

const catalogInput = (overrides: Partial<CatalogUpsertInput> = {}): CatalogUpsertInput => ({
  additionalCategoryIds: [],
  collectionIds: [],
  descriptions: locales(""),
  handle: "srebrny-pierscionek",
  hasVariants: false,
  options: [],
  primaryCategoryId: PRIMARY_CATEGORY_ID,
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku: " SR-1 " },
  status: PRODUCT_ADMIN_STATUS.DRAFT,
  subtitles: locales(""),
  tags: { "en-US": [], "pl-PL": [] },
  titles: locales("Srebrny pierścionek", "Silver ring"),
  variants: [],
  ...overrides,
})

describe("coerceProductLocaleMap", () => {
  it("lifts a legacy plain string into the default locale", () => {
    expect(coerceProductLocaleMap("Pierścionek")).toStrictEqual(locales("Pierścionek", ""))
  })

  it.each([[null], [undefined], [["Pierścionek"]], [7]])("falls back to an empty map for %j", (value) => {
    expect(coerceProductLocaleMap(value)).toStrictEqual(locales("", ""))
  })

  it("keeps only the supported locales", () => {
    expect(coerceProductLocaleMap({ "de-DE": "Ring", "en-US": "Ring" })).toStrictEqual(locales("", "Ring"))
  })
})

describe("normalizeOptionalProductLocaleMapForSave", () => {
  it("drops a map that is blank in every locale", () => {
    expect(normalizeOptionalProductLocaleMapForSave(locales(" ", ""))).toBeUndefined()
  })

  it("trims a partially filled map", () => {
    expect(normalizeOptionalProductLocaleMapForSave(locales(" Pierścionek ", " "))).toStrictEqual(locales("Pierścionek", ""))
  })
})

describe("resolving localized product copy", () => {
  it.each([
    ["title", resolveProductTitle],
    ["subtitle", resolveProductSubtitle],
    ["description", resolveProductDescription],
  ])("resolves the %s for the requested locale and falls back", (_label, resolve) => {
    expect(resolve(locales("Pierścionek", "Ring"), "en-US")).toBe("Ring")
    expect(resolve(locales("Pierścionek", ""), "en-US")).toBe("Pierścionek")
    expect(resolve(null, "pl-PL")).toBe("")
  })
})

describe("product tag locale maps", () => {
  it("starts with an empty list per locale", () => {
    expect(createEmptyProductTagsLocaleMap()).toStrictEqual({ "en-US": [], "pl-PL": [] })
  })

  it("lifts a legacy flat array into the default locale", () => {
    expect(coerceProductTagsLocaleMap(["srebro", 7, "nowość"])).toStrictEqual({ "en-US": [], "pl-PL": ["srebro", "nowość"] })
  })

  it.each([[null], [undefined], ["srebro"]])("falls back to empty lists for %j", (value) => {
    expect(coerceProductTagsLocaleMap(value)).toStrictEqual(createEmptyProductTagsLocaleMap())
  })

  it("drops non-string entries and non-array locales", () => {
    expect(coerceProductTagsLocaleMap({ "en-US": "silver", "pl-PL": ["srebro", null] })).toStrictEqual({
      "en-US": [],
      "pl-PL": ["srebro"],
    })
  })

  it("trims and drops blank tags before saving", () => {
    expect(normalizeProductTagsLocaleMapForSave({ "en-US": [" silver ", "  "], "pl-PL": [] })).toStrictEqual({
      "en-US": ["silver"],
      "pl-PL": [],
    })
  })

  it("stores nothing when every locale ends up empty", () => {
    expect(normalizeProductTagsLocaleMapForSave({ "en-US": ["  "], "pl-PL": [] })).toBeUndefined()
  })

  it("resolves the requested locale and falls back for an unsupported one", () => {
    const tags = { "en-US": ["silver"], "pl-PL": ["srebro"] }

    expect(resolveProductTags(tags, "en-US")).toStrictEqual(["silver"])
    expect(resolveProductTags(tags, "de-DE")).toStrictEqual(["srebro"])
  })
})

describe("buildVariantStatsByProductId", () => {
  it("keys the aggregate stats by product and normalises a missing minimum price", () => {
    const stats = buildVariantStatsByProductId([
      { minPrice: 12_000, productId: "product-1", totalStock: 7, variantCount: 2 },
      { minPrice: null, productId: "product-2", totalStock: 0, variantCount: 1 },
    ])

    expect(stats.get("product-1")).toStrictEqual({ minPrice: 12_000, totalStock: 7, variantCount: 2 })
    expect(stats.get("product-2")?.minPrice).toBeUndefined()
    expect(stats.get("missing")).toBeUndefined()
  })
})

describe("buildSkuSummaryByProductId", () => {
  it("joins the distinct trimmed SKUs of each product", () => {
    const summary = buildSkuSummaryByProductId([
      { productId: "product-1", sku: " SR-1 " },
      { productId: "product-1", sku: "SR-2" },
      { productId: "product-1", sku: "SR-1" },
      { productId: "product-2", sku: null },
      { productId: "product-2", sku: "   " },
    ])

    expect(summary.get("product-1")).toBe("SR-1, SR-2")
    expect(summary.has("product-2")).toBe(false)
  })

  it("is empty when no variant carries a SKU", () => {
    expect(buildSkuSummaryByProductId([])).toStrictEqual(new Map())
  })
})

describe("resolveProductVariantKind", () => {
  it.each([
    [0, PRODUCT_VARIANT_KIND.SINGLE],
    [1, PRODUCT_VARIANT_KIND.SINGLE],
    [2, PRODUCT_VARIANT_KIND.MULTI],
  ])("treats %i variants as %s", (variantCount, expected) => {
    expect(resolveProductVariantKind(variantCount)).toBe(expected)
  })
})

describe("admin and database status mapping", () => {
  it.each([
    [PRODUCT_ADMIN_STATUS.ACTIVE, PRODUCT_STATUS.PUBLISHED],
    [PRODUCT_ADMIN_STATUS.ARCHIVED, PRODUCT_STATUS.ARCHIVED],
    [PRODUCT_ADMIN_STATUS.DRAFT, PRODUCT_STATUS.DRAFT],
  ])("stores the admin status %s as %s", (adminStatus, dbStatus) => {
    expect(toProductDbStatus(adminStatus)).toBe(dbStatus)
  })

  it.each([
    [PRODUCT_STATUS.PUBLISHED, PRODUCT_ADMIN_STATUS.ACTIVE],
    [PRODUCT_STATUS.ARCHIVED, PRODUCT_ADMIN_STATUS.ARCHIVED],
    [PRODUCT_STATUS.DRAFT, PRODUCT_ADMIN_STATUS.DRAFT],
  ])("shows the stored status %s as %s", (dbStatus, adminStatus) => {
    expect(toProductAdminStatus(dbStatus)).toBe(adminStatus)
  })

  it("round trips every admin status", () => {
    for (const adminStatus of [PRODUCT_ADMIN_STATUS.ACTIVE, PRODUCT_ADMIN_STATUS.ARCHIVED, PRODUCT_ADMIN_STATUS.DRAFT]) {
      expect(toProductAdminStatus(toProductDbStatus(adminStatus))).toBe(adminStatus)
    }
  })
})

describe("resolveProductInventoryLevel", () => {
  it.each([[PRODUCT_STATUS.DRAFT], [PRODUCT_STATUS.ARCHIVED]])("does not warn about stock for an unpublished %s product", (status) => {
    expect(resolveProductInventoryLevel(status, 0)).toBe(PRODUCT_INVENTORY_LEVEL.OK)
  })

  it.each([
    [0, PRODUCT_INVENTORY_LEVEL.OUT],
    [-3, PRODUCT_INVENTORY_LEVEL.OUT],
    [1, PRODUCT_INVENTORY_LEVEL.LOW],
    [PRODUCT_LOW_STOCK_THRESHOLD, PRODUCT_INVENTORY_LEVEL.LOW],
    [PRODUCT_LOW_STOCK_THRESHOLD + 1, PRODUCT_INVENTORY_LEVEL.OK],
  ])("reports %i units of a published product as %s", (totalStock, expected) => {
    expect(resolveProductInventoryLevel(PRODUCT_STATUS.PUBLISHED, totalStock)).toBe(expected)
  })
})

describe("prepareOrganizationReplacePayload", () => {
  it("declines to touch the organization rows when no primary category was chosen", () => {
    expect(prepareOrganizationReplacePayload("product-1", catalogInput({ primaryCategoryId: "" }))).toBeUndefined()
  })

  it("marks the primary category and de-duplicates the additional ones", () => {
    const payload = prepareOrganizationReplacePayload(
      "product-1",
      catalogInput({ additionalCategoryIds: [EXTRA_CATEGORY_ID, EXTRA_CATEGORY_ID, PRIMARY_CATEGORY_ID] }),
    )

    expect(payload?.categoryRows).toStrictEqual([
      { categoryId: PRIMARY_CATEGORY_ID, isPrimary: true, productId: "product-1" },
      { categoryId: EXTRA_CATEGORY_ID, isPrimary: false, productId: "product-1" },
    ])
  })

  it("ranks collections in the order they were selected, without duplicates", () => {
    const payload = prepareOrganizationReplacePayload("product-1", catalogInput({ collectionIds: [COLLECTION_ID, COLLECTION_ID] }))

    expect(payload?.collectionRows).toStrictEqual([{ collectionId: COLLECTION_ID, productId: "product-1", rank: 0 }])
  })
})

describe("prepareCatalogReplacePayload for a simple product", () => {
  it("creates exactly one default variant with its inventory row", () => {
    const payload = prepareCatalogReplacePayload("product-1", catalogInput())

    expect(payload.optionRows).toStrictEqual([])
    expect(payload.optionValueRows).toStrictEqual([])
    expect(payload.optionOnVariantRows).toStrictEqual([])
    expect(payload.variantRows).toHaveLength(1)
    expect(payload.inventoryRows).toHaveLength(1)
  })

  it("stores the price in minor units and trims the SKU", () => {
    const [variantRow] = prepareCatalogReplacePayload("product-1", catalogInput()).variantRows

    expect(variantRow?.price).toBe(12_000)
    expect(variantRow?.sku).toBe("SR-1")
    expect(variantRow?.compareAtPrice).toBeUndefined()
  })

  it("drops an all-whitespace SKU instead of storing it", () => {
    const input = catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 0, sku: "  " } })

    expect(prepareCatalogReplacePayload("product-1", input).variantRows[0]?.sku).toBeUndefined()
  })

  it("opens the inventory row at the requested quantity with nothing reserved", () => {
    const [inventoryRow] = prepareCatalogReplacePayload("product-1", catalogInput()).inventoryRows

    expect(inventoryRow).toMatchObject({ quantityAvailable: 5, quantityReserved: 0, version: 1 })
  })

  it("links the inventory row to the variant it was created for", () => {
    const payload = prepareCatalogReplacePayload("product-1", catalogInput())

    expect(payload.inventoryRows[0]?.variantId).toBe(payload.variantRows[0]?.id)
  })

  it("refuses to persist a price it cannot parse", () => {
    const input = catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "abc", quantity: 1, sku: "" } })

    expect(() => prepareCatalogReplacePayload("product-1", input)).toThrow("Invalid money input")
  })

  it("still builds the default variant when no simple variant was submitted", () => {
    const payload = prepareCatalogReplacePayload("product-1", catalogInput({ simpleVariant: undefined }))
    const [variantRow] = payload.variantRows

    expect(variantRow).toMatchObject({ compareAtPrice: undefined, price: 0, sku: undefined, title: "Default" })
    expect(payload.inventoryRows[0]?.quantityAvailable).toBe(0)
  })

  it("keeps a supplied compare-at price in minor units", () => {
    const input = catalogInput({
      simpleVariant: { compareAtPrice: "150.00", manageInventory: true, price: "120.00", quantity: 1, sku: "" },
    })

    expect(prepareCatalogReplacePayload("product-1", input).variantRows[0]?.compareAtPrice).toBe(15_000)
  })
})

describe("prepareCatalogReplacePayload for a variant product", () => {
  const variantInput = catalogInput({
    hasVariants: true,
    options: [
      {
        titles: locales("Rozmiar", "Size"),
        values: [{ labels: locales("Mały", "Small") }, { labels: locales("Duży", "Large") }],
      },
    ],
    simpleVariant: undefined,
    variants: [
      { compareAtPrice: "", manageInventory: true, optionValues: { Rozmiar: "Mały" }, price: "100.00", quantity: 2, sku: "SR-S" },
      { compareAtPrice: "", manageInventory: true, optionValues: { Rozmiar: "Duży" }, price: "130.00", quantity: 3, sku: "SR-L" },
    ],
  })

  it("persists one option with one row per value", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput)

    expect(payload.optionRows).toHaveLength(1)
    expect(payload.optionValueRows).toHaveLength(2)
    expect(payload.optionValueRows.map((row) => row.rank)).toStrictEqual([0, 1])
  })

  it("creates one variant per option value combination", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput)

    expect(payload.variantRows).toHaveLength(2)
    expect(payload.inventoryRows.map((row) => row.quantityAvailable)).toStrictEqual([2, 3])
  })

  it("keeps unfilled draft combinations unpriced and out of stock", () => {
    const payload = prepareCatalogReplacePayload("product-1", { ...variantInput, variants: variantInput.variants.slice(0, 1) })

    expect(payload.variantRows.map((row) => ({ price: row.price, sku: row.sku, title: row.title }))).toStrictEqual([
      { price: 10_000, sku: "SR-S", title: "Mały" },
      { price: 0, sku: undefined, title: "Duży" },
    ])
    expect(payload.inventoryRows.map((row) => row.quantityAvailable)).toStrictEqual([2, 0])
    expect(new Set(payload.variantRows.map((row) => row.id)).size).toBe(2)
  })

  it("matches each submitted row to its combination by option values", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput)

    expect(payload.variantRows.map((row) => row.price)).toStrictEqual([10_000, 13_000])
    expect(payload.variantRows.map((row) => row.sku)).toStrictEqual(["SR-S", "SR-L"])
  })

  it("keeps each variant's compare-at price and persisted identity", () => {
    const payload = prepareCatalogReplacePayload("product-1", {
      ...variantInput,
      variants: variantInput.variants.map((row, index) => ({ ...row, compareAtPrice: "180.00", id: `existing-${index}` })),
    })

    expect(payload.variantRows.map((row) => ({ compareAtPrice: row.compareAtPrice, id: row.id }))).toStrictEqual([
      { compareAtPrice: 18_000, id: "existing-0" },
      { compareAtPrice: 18_000, id: "existing-1" },
    ])
  })

  it("links every variant to the persisted option value row once the option carries its id", () => {
    const payload = prepareCatalogReplacePayload("product-1", {
      ...variantInput,
      options: [
        {
          id: OPTION_ID,
          titles: locales("Rozmiar", "Size"),
          values: [
            { id: SMALL_VALUE_ID, labels: locales("Mały", "Small") },
            { id: LARGE_VALUE_ID, labels: locales("Duży", "Large") },
          ],
        },
      ],
      variants: [
        { compareAtPrice: "", manageInventory: true, optionValues: { [OPTION_ID]: SMALL_VALUE_ID }, price: "100.00", quantity: 2, sku: "" },
        { compareAtPrice: "", manageInventory: true, optionValues: { [OPTION_ID]: LARGE_VALUE_ID }, price: "130.00", quantity: 3, sku: "" },
      ],
    })

    const valueIds = new Set(payload.optionValueRows.map((row) => row.id))

    expect(payload.optionOnVariantRows).toHaveLength(2)
    expect(payload.optionOnVariantRows.every((row) => valueIds.has(row.valueId))).toBe(true)
    expect(payload.optionOnVariantRows.map((row) => row.optionId)).toStrictEqual([OPTION_ID, OPTION_ID])
  })

  it("writes no option_on_variant rows at all when the option has no persisted id, as on a first create", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput)

    expect(payload.variantRows).toHaveLength(2)
    expect(payload.optionValueRows).toHaveLength(2)
    expect(payload.optionOnVariantRows).toStrictEqual([])
  })

  it("names a variant after its combination when the submitted title is blank", () => {
    const payload = prepareCatalogReplacePayload("product-1", {
      ...variantInput,
      variants: variantInput.variants.map((row) => ({ ...row, title: "  " })),
    })

    expect(payload.variantRows.map((row) => row.title)).toStrictEqual(["Mały", "Duży"])
  })

  it("keeps a submitted variant title", () => {
    const payload = prepareCatalogReplacePayload("product-1", {
      ...variantInput,
      variants: variantInput.variants.map((row, index) => ({ ...row, title: `Wariant ${index}` })),
    })

    expect(payload.variantRows.map((row) => row.title)).toStrictEqual(["Wariant 0", "Wariant 1"])
  })

  it("falls back to the row at the same index when no option values were submitted", () => {
    const payload = prepareCatalogReplacePayload("product-1", {
      ...variantInput,
      variants: variantInput.variants.map((row) => ({ ...row, optionValues: {} })),
    })

    expect(payload.variantRows.map((row) => row.price)).toStrictEqual([10_000, 13_000])
  })

  it("ignores the submitted rows' own ids for options it had to normalise away", () => {
    const payload = prepareCatalogReplacePayload("product-1", {
      ...variantInput,
      options: [{ titles: { "en-US": "", "pl-PL": "Rozmiar" }, values: [{ labels: locales("Mały") }] }],
    })

    expect(payload.optionRows).toStrictEqual([])
    expect(payload.variantRows).toHaveLength(1)
    expect(payload.variantRows[0]?.title).toBe("Default")
  })
})
