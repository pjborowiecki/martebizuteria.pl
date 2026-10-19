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
  resolveProductDescription,
  resolveProductInventoryLevel,
  resolveProductSubtitle,
  resolveProductTags,
  resolveProductTitle,
  resolveProductVariantKind,
  toProductAdminStatus,
  toProductDbStatus,
} from "~/src/modules/product/product.utils"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

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
