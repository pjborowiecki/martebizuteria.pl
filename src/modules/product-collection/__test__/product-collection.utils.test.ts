import { describe, expect, it } from "vite-plus/test"

import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"
import {
  coerceCollectionLocaleMap,
  computeCollectionStats,
  normalizeOptionalCollectionLocaleMapForSave,
  resolveCollectionDescription,
  resolveCollectionTitle,
  toAdminCollectionListItem,
  toCollectionRow,
} from "~/src/modules/product-collection/product-collection.utils"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const collectionRow: ProductCollection["select"] = {
  createdAt: new Date(2024, 0, 1),
  descriptions: null,
  handle: "wiosna",
  id: "collection-1",
  image: null,
  metadata: null,
  rank: 0,
  shortDescriptions: null,
  status: COLLECTION_STATUS.ACTIVE,
  titles: locales("Wiosna", "Spring"),
  updatedAt: new Date(2024, 0, 1),
}

describe("coerceCollectionLocaleMap", () => {
  it("lifts a legacy plain string into the default locale", () => {
    expect(coerceCollectionLocaleMap("Wiosna")).toStrictEqual(locales("Wiosna", ""))
  })

  it.each([[null], [undefined], [["Wiosna"]]])("falls back to an empty map for %j", (value) => {
    expect(coerceCollectionLocaleMap(value)).toStrictEqual(locales("", ""))
  })
})

describe("resolving localized collection copy", () => {
  it("prefers the requested locale and falls back to the default", () => {
    expect(resolveCollectionTitle(locales("Wiosna", "Spring"), "en-US")).toBe("Spring")
    expect(resolveCollectionTitle(locales("Wiosna", ""), "en-US")).toBe("Wiosna")
    expect(resolveCollectionDescription(null, "pl-PL")).toBe("")
  })
})

describe("normalizeOptionalCollectionLocaleMapForSave", () => {
  it("drops a map that is blank everywhere", () => {
    expect(normalizeOptionalCollectionLocaleMapForSave(locales(" ", ""))).toBeUndefined()
  })

  it("trims what is filled in", () => {
    expect(normalizeOptionalCollectionLocaleMapForSave(locales(" Wiosna ", ""))).toStrictEqual(locales("Wiosna", ""))
  })
})

describe("toAdminCollectionListItem", () => {
  it("adds the product count and normalises the stored titles", () => {
    expect(toAdminCollectionListItem({ ...collectionRow, titles: locales("Wiosna") }, 4)).toMatchObject({
      productCount: 4,
      titles: locales("Wiosna"),
    })
  })
})

describe("toCollectionRow", () => {
  const input: ProductCollection["createInput"] = {
    descriptions: locales("", ""),
    handle: "wiosna",
    image: "",
    shortDescriptions: locales("", ""),
    status: COLLECTION_STATUS.DRAFT,
    titles: locales(" Wiosna ", " Spring "),
  }

  it("trims titles, drops the blank description and clears the empty image", () => {
    const row = toCollectionRow(input, "collection-9", 2)

    expect(row).toMatchObject({ handle: "wiosna", id: "collection-9", rank: 2, titles: locales("Wiosna", "Spring") })
    expect(row.descriptions).toBeUndefined()
    expect(row.image).toBeUndefined()
  })

  it("keeps a supplied image", () => {
    expect(toCollectionRow({ ...input, image: "collections/wiosna.jpg" }, "collection-9", 2).image).toBe("collections/wiosna.jpg")
  })
})

describe("computeCollectionStats", () => {
  it("averages products per collection to one decimal", () => {
    expect(computeCollectionStats({ active: 2, draft: 1, total: 3 }, 10)).toStrictEqual({
      active: 2,
      avgProducts: 3.3,
      draft: 1,
      total: 3,
    })
  })

  it("avoids dividing by zero and tolerates a missing count row", () => {
    expect(computeCollectionStats({ active: 0, draft: 0, total: 0 }, 5).avgProducts).toBe(0)
    expect(computeCollectionStats(undefined, 5)).toStrictEqual({ active: 0, avgProducts: 0, draft: 0, total: 0 })
  })
})
