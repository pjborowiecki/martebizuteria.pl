import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_INVENTORY_LEVEL, PRODUCT_LOW_STOCK_THRESHOLD, PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { type AdminProductListRow, toAdminProductListItem } from "~/src/modules/product/product.utils"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const NOW = new Date("2026-03-14T10:00:00.000Z")

const PRODUCT_ID = "prod-1"

const RINGS_CATEGORY_ID = "cat-rings"

const EARRINGS_CATEGORY_ID = "cat-earrings"

const attributeRow = (attributeId: string, pl: string, en: string): AdminProductListRow["attributes"][number] => ({
  attributeId,
  createdAt: NOW,
  id: `aop-${attributeId}`,
  productAttribute: { titles: locales(pl, en) },
  productId: PRODUCT_ID,
  rank: 0,
  updatedAt: NOW,
  value: "silver",
  variantId: null,
})

const categoryRow = (
  categoryId: string,
  titles: readonly [string, string],
  isPrimary = false,
): AdminProductListRow["categories"][number] => ({
  categoryId,
  isPrimary,
  productCategory: { titles: locales(titles[0], titles[1]) },
  productId: PRODUCT_ID,
})

const collectionRow = (collectionId: string, pl: string, en: string): AdminProductListRow["collections"][number] => ({
  collectionId,
  productCollection: { titles: locales(pl, en) },
  productId: PRODUCT_ID,
  rank: 0,
})

const listRow = (overrides: Partial<AdminProductListRow> = {}): AdminProductListRow => ({
  attributes: [],
  categories: [],
  collections: [],
  createdAt: NOW,
  descriptions: null,
  handle: "srebrny-pierscionek",
  id: PRODUCT_ID,
  metadata: null,
  primaryCategoryId: null,
  rank: 0,
  status: PRODUCT_STATUS.PUBLISHED,
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: locales("Srebrny pierścionek", "Silver ring"),
  updatedAt: NOW,
  ...overrides,
})

const stats = (variantCount: number, totalStock: number, minPrice?: number) =>
  new Map([[PRODUCT_ID, { minPrice, totalStock, variantCount }]])

const noStats = () => new Map<string, { minPrice: number | undefined; totalStock: number; variantCount: number }>()

describe("toAdminProductListItem aggregates", () => {
  it("treats a product with no stats row as having no variants and no stock", () => {
    const item = toAdminProductListItem(listRow(), noStats())

    expect(item.variantCount).toBe(0)
    expect(item.totalStock).toBe(0)
    expect(item.minPrice).toBeUndefined()
  })

  it("copies the aggregate stats of the product it was given", () => {
    const item = toAdminProductListItem(listRow(), stats(3, 12, 9900))

    expect(item.variantCount).toBe(3)
    expect(item.totalStock).toBe(12)
    expect(item.minPrice).toBe(9900)
  })

  it("marks a published product with no stock as out of stock", () => {
    const item = toAdminProductListItem(listRow(), stats(1, 0))

    expect(item.inventoryLevel).toBe(PRODUCT_INVENTORY_LEVEL.OUT)
  })

  it("marks a published product at the low stock threshold as low", () => {
    const item = toAdminProductListItem(listRow(), stats(1, PRODUCT_LOW_STOCK_THRESHOLD))

    expect(item.inventoryLevel).toBe(PRODUCT_INVENTORY_LEVEL.LOW)
  })

  it("never warns about the stock of a draft product", () => {
    const item = toAdminProductListItem(listRow({ status: PRODUCT_STATUS.DRAFT }), stats(1, 0))

    expect(item.inventoryLevel).toBe(PRODUCT_INVENTORY_LEVEL.OK)
  })

  it("attaches the SKU summary of the product and nothing when it has none", () => {
    const withSummary = toAdminProductListItem(listRow(), noStats(), new Map([[PRODUCT_ID, "SR-1, SR-2"]]))
    const withoutSummary = toAdminProductListItem(listRow(), noStats(), new Map([["other", "SR-9"]]))

    expect(withSummary.skuSummary).toBe("SR-1, SR-2")
    expect(withoutSummary.skuSummary).toBeUndefined()
  })
})

describe("toAdminProductListItem relations", () => {
  it("joins the attribute titles once per attribute", () => {
    const item = toAdminProductListItem(
      listRow({
        attributes: [
          attributeRow("attr-material", "Materiał", "Material"),
          attributeRow("attr-material", "Materiał", "Material"),
          attributeRow("attr-weight", "Waga", "Weight"),
        ],
      }),
      noStats(),
    )

    expect(item.attributeTitles).toBe("Materiał, Waga")
  })

  it("leaves the attribute titles empty when the product has none", () => {
    expect(toAdminProductListItem(listRow(), noStats()).attributeTitles).toBe("")
  })

  it("prefers the category flagged as primary", () => {
    const item = toAdminProductListItem(
      listRow({
        categories: [
          categoryRow(EARRINGS_CATEGORY_ID, ["Kolczyki", "Earrings"]),
          categoryRow(RINGS_CATEGORY_ID, ["Pierścionki", "Rings"], true),
        ],
      }),
      noStats(),
    )

    expect(item.categoryTitle).toBe("Pierścionki")
  })

  it("falls back to the category the product row points at", () => {
    const item = toAdminProductListItem(
      listRow({
        categories: [categoryRow(EARRINGS_CATEGORY_ID, ["Kolczyki", "Earrings"]), categoryRow(RINGS_CATEGORY_ID, ["Pierścionki", "Rings"])],
        primaryCategoryId: RINGS_CATEGORY_ID,
      }),
      noStats(),
    )

    expect(item.categoryTitle).toBe("Pierścionki")
  })

  it("falls back to the first category when nothing marks a primary one", () => {
    const item = toAdminProductListItem(
      listRow({
        categories: [categoryRow(EARRINGS_CATEGORY_ID, ["Kolczyki", "Earrings"]), categoryRow(RINGS_CATEGORY_ID, ["Pierścionki", "Rings"])],
      }),
      noStats(),
    )

    expect(item.categoryTitle).toBe("Kolczyki")
  })

  it("reports no category title at all for an unassigned product", () => {
    expect(toAdminProductListItem(listRow(), noStats()).categoryTitle).toBeUndefined()
  })

  it("reports no category title when the only category has a blank name", () => {
    const item = toAdminProductListItem(listRow({ categories: [categoryRow(RINGS_CATEGORY_ID, ["", ""], true)] }), noStats())

    expect(item.categoryTitle).toBeUndefined()
  })

  it("joins every category title and drops the blank ones", () => {
    const item = toAdminProductListItem(
      listRow({
        categories: [categoryRow(RINGS_CATEGORY_ID, ["Pierścionki", "Rings"], true), categoryRow(EARRINGS_CATEGORY_ID, ["", ""])],
      }),
      noStats(),
    )

    expect(item.categoryTitles).toBe("Pierścionki")
  })

  it("joins the collection titles in the order they arrive", () => {
    const item = toAdminProductListItem(
      listRow({
        collections: [collectionRow("col-1", "Nowości", "New"), collectionRow("col-2", "Wyprzedaż", "Sale")],
      }),
      noStats(),
    )

    expect(item.collectionTitles).toBe("Nowości, Wyprzedaż")
  })
})

describe("toAdminProductListItem localized columns", () => {
  it("coerces missing locale maps into empty ones", () => {
    const item = toAdminProductListItem(listRow(), noStats())

    expect(item.descriptions).toStrictEqual(locales(""))
    expect(item.subtitles).toStrictEqual(locales(""))
    expect(item.tags).toStrictEqual({ "en-US": [], "pl-PL": [] })
  })

  it("keeps the locale maps the row already carries", () => {
    const item = toAdminProductListItem(
      listRow({
        descriptions: locales("Opis", "Description"),
        subtitles: locales("Podtytuł", "Subtitle"),
        tags: { "en-US": ["silver"], "pl-PL": ["srebro"] },
      }),
      noStats(),
    )

    expect(item.descriptions).toStrictEqual(locales("Opis", "Description"))
    expect(item.subtitles).toStrictEqual(locales("Podtytuł", "Subtitle"))
    expect(item.tags).toStrictEqual({ "en-US": ["silver"], "pl-PL": ["srebro"] })
  })

  it("drops the relation arrays from the item it hands to the table", () => {
    const item = toAdminProductListItem(listRow({ categories: [categoryRow(RINGS_CATEGORY_ID, ["Pierścionki", "Rings"])] }), noStats())

    expect(Object.keys(item)).not.toContain("categories")
    expect(Object.keys(item)).not.toContain("collections")
    expect(Object.keys(item)).not.toContain("attributes")
  })

  it("keeps the identifying columns of the product row", () => {
    const item = toAdminProductListItem(listRow(), noStats())

    expect(item.id).toBe(PRODUCT_ID)
    expect(item.handle).toBe("srebrny-pierscionek")
    expect(item.titles).toStrictEqual(locales("Srebrny pierścionek", "Silver ring"))
  })
})
