import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { rowMatchesCatalogTableSearch } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import {
  getAttributeAdminSearchParts,
  getCategoryAdminSearchParts,
  getCollectionAdminSearchParts,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-table-search"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const CREATED_AT = new Date(2024, 5, 15)

const categoryRow = (overrides: Partial<ProductCategory["adminListItem"]> = {}): ProductCategory["adminListItem"] => ({
  createdAt: CREATED_AT,
  descriptions: locales("Długi opis", "Long description"),
  handle: "kolczyki",
  id: "category-1",
  image: null,
  metadata: null,
  parentId: null,
  parentTitles: locales("Biżuteria", "Jewellery"),
  productCount: 7,
  rank: 0,
  shortDescriptions: locales("Krótki", "Short"),
  status: CATEGORY_STATUS.ACTIVE,
  subtitles: locales("Podtytuł", "Subtitle"),
  titles: locales("Kolczyki", "Earrings"),
  updatedAt: CREATED_AT,
  ...overrides,
})

const collectionRow = (overrides: Partial<ProductCollection["adminListItem"]> = {}): ProductCollection["adminListItem"] => ({
  createdAt: CREATED_AT,
  descriptions: locales("Opis", "Description"),
  handle: "wiosna",
  id: "collection-1",
  image: null,
  metadata: null,
  productCount: 3,
  rank: 0,
  shortDescriptions: null,
  status: COLLECTION_STATUS.ACTIVE,
  titles: locales("Wiosna", "Spring"),
  updatedAt: CREATED_AT,
  ...overrides,
})

const attributeRow = (overrides: Partial<ProductAttribute["adminListItem"]> = {}): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: CREATED_AT,
  handle: "materials",
  id: "attribute-1",
  productCount: 5,
  rank: 0,
  titles: locales("Materiał", "Material"),
  type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
  unit: "mm",
  updatedAt: CREATED_AT,
  ...overrides,
})

describe("getCategoryAdminSearchParts", () => {
  const parts = getCategoryAdminSearchParts(categoryRow(), "Aktywna")

  it.each([
    ["Kolczyki"],
    ["Earrings"],
    ["kolczyki"],
    ["category-1"],
    ["active"],
    ["Aktywna"],
    ["Biżuteria"],
    ["Podtytuł"],
    ["Krótki"],
    ["Długi opis"],
    ["7"],
  ])("makes the row findable by %j", (term) => {
    expect(rowMatchesCatalogTableSearch(parts, term)).toBe(true)
  })

  it("makes the row findable by its ISO creation date", () => {
    expect(rowMatchesCatalogTableSearch(parts, CREATED_AT.toISOString())).toBe(true)
  })

  it("does not match an unrelated term", () => {
    expect(rowMatchesCatalogTableSearch(parts, "naszyjniki")).toBe(false)
  })

  it("skips a parent that was never loaded", () => {
    const rootParts = getCategoryAdminSearchParts(categoryRow({ parentTitles: undefined }), "Aktywna")

    expect(rowMatchesCatalogTableSearch(rootParts, "Biżuteria")).toBe(false)
  })

  it("skips a locale map the row does not carry", () => {
    const withoutDescriptions = getCategoryAdminSearchParts(categoryRow({ descriptions: null }), "Aktywna")

    expect(rowMatchesCatalogTableSearch(withoutDescriptions, "Długi opis")).toBe(false)
  })

  it("skips a blank locale rather than adding an empty part", () => {
    const blankSubtitles = getCategoryAdminSearchParts(categoryRow({ subtitles: locales("", "") }), "Aktywna")

    expect(blankSubtitles.every((part) => part !== "")).toBe(true)
  })
})

describe("getCollectionAdminSearchParts", () => {
  const parts = getCollectionAdminSearchParts(collectionRow(), "Aktywna")

  it.each([["Wiosna"], ["Spring"], ["wiosna"], ["collection-1"], ["active"], ["Aktywna"], ["Opis"], ["3"]])(
    "makes the row findable by %j",
    (term) => {
      expect(rowMatchesCatalogTableSearch(parts, term)).toBe(true)
    },
  )

  it("does not match an unrelated term", () => {
    expect(rowMatchesCatalogTableSearch(parts, "zima")).toBe(false)
  })

  it("leaves a date the row stored as garbage out of the searchable parts", () => {
    const brokenDateParts = getCollectionAdminSearchParts(collectionRow({ createdAt: new Date("not a date") }), "Aktywna")

    expect(brokenDateParts.filter((part) => part.includes("Invalid"))).toStrictEqual([])
    expect(rowMatchesCatalogTableSearch(brokenDateParts, "Wiosna")).toBe(true)
    expect(rowMatchesCatalogTableSearch(brokenDateParts, "collection-1")).toBe(true)
    expect(rowMatchesCatalogTableSearch(brokenDateParts, "Aktywna")).toBe(true)
    expect(rowMatchesCatalogTableSearch(brokenDateParts, CREATED_AT.toISOString())).toBe(true)
    expect(brokenDateParts.filter((part) => part === CREATED_AT.toISOString())).toHaveLength(1)
  })
})

describe("getAttributeAdminSearchParts", () => {
  const parts = getAttributeAdminSearchParts(attributeRow(), "Wybór", "Srebro, Złoto")

  it.each([["Materiał"], ["Material"], ["materials"], ["attribute-1"], ["select"], ["Wybór"], ["Srebro"], ["mm"], ["5"]])(
    "makes the row findable by %j",
    (term) => {
      expect(rowMatchesCatalogTableSearch(parts, term)).toBe(true)
    },
  )

  it("skips a unit the attribute does not have", () => {
    const unitlessParts = getAttributeAdminSearchParts(attributeRow({ unit: null }), "Wybór", "")

    expect(unitlessParts).not.toContain("mm")
  })

  it("does not match an unrelated term", () => {
    expect(rowMatchesCatalogTableSearch(parts, "rozmiar")).toBe(false)
  })
})
