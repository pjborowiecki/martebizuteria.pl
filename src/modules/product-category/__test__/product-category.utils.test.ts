import { describe, expect, it } from "vite-plus/test"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import {
  buildCategoryRankUpdates,
  coerceCategoryLocaleMap,
  collectDescendantCategoryIds,
  computeCategoryStats,
  normalizeCategoryParentId,
  normalizeCategoryParentIdForMutation,
  normalizeOptionalCategoryLocaleMapForSave,
  resolveCategoryDescription,
  resolveCategoryShortDescription,
  resolveCategorySubtitle,
  resolveCategoryTitle,
  toAdminCategoryListItem,
  toCategoryRow,
  withActiveSortedChildren,
  wouldCreateCategoryParentCycle,
} from "~/src/modules/product-category/product-category.utils"

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const categoryRow = (overrides: Partial<ProductCategory["select"]> = {}): ProductCategory["select"] => ({
  createdAt: new Date(2024, 0, 1),
  descriptions: null,
  handle: "kolczyki",
  id: "category-1",
  image: null,
  metadata: null,
  parentId: null,
  rank: 0,
  shortDescriptions: null,
  status: CATEGORY_STATUS.ACTIVE,
  subtitles: null,
  titles: locales("Kolczyki", "Earrings"),
  updatedAt: new Date(2024, 0, 1),
  ...overrides,
})

describe("coerceCategoryLocaleMap", () => {
  it("lifts a legacy plain string into the default locale", () => {
    expect(coerceCategoryLocaleMap("Kolczyki")).toStrictEqual(locales("Kolczyki", ""))
  })

  it.each([[null], [undefined], [["Kolczyki"]], [42]])("falls back to an empty map for %j", (value) => {
    expect(coerceCategoryLocaleMap(value)).toStrictEqual(locales("", ""))
  })

  it("keeps only the supported locales", () => {
    expect(coerceCategoryLocaleMap({ "de-DE": "Ohrringe", "pl-PL": "Kolczyki" })).toStrictEqual(locales("Kolczyki", ""))
  })
})

describe("normalizeOptionalCategoryLocaleMapForSave", () => {
  it("drops a map that is blank in every locale so the column stays null", () => {
    expect(normalizeOptionalCategoryLocaleMapForSave(locales("  ", " "))).toBeUndefined()
  })

  it("trims and keeps a partially filled map", () => {
    expect(normalizeOptionalCategoryLocaleMapForSave(locales(" Kolczyki ", ""))).toStrictEqual(locales("Kolczyki", ""))
  })
})

describe("resolving localized category copy", () => {
  it.each([
    ["title", resolveCategoryTitle],
    ["subtitle", resolveCategorySubtitle],
    ["short description", resolveCategoryShortDescription],
    ["description", resolveCategoryDescription],
  ])("resolves the %s for the requested locale", (_label, resolve) => {
    expect(resolve(locales("Kolczyki", "Earrings"), "en-US")).toBe("Earrings")
    expect(resolve(null, "en-US")).toBe("")
  })

  it("falls back to the default locale", () => {
    expect(resolveCategoryTitle(locales("Kolczyki", ""), "en-US")).toBe("Kolczyki")
  })
})

describe("withActiveSortedChildren", () => {
  it("keeps only active children, ordered by rank", () => {
    const result = withActiveSortedChildren({
      ...categoryRow(),
      children: [
        categoryRow({ id: "b", rank: 2 }),
        categoryRow({ id: "draft", rank: 0, status: CATEGORY_STATUS.DRAFT }),
        categoryRow({ id: "a", rank: 1 }),
      ],
    })

    expect(result).toMatchObject({ children: [{ id: "a" }, { id: "b" }] })
  })

  it("yields an empty child list when none were loaded", () => {
    expect(withActiveSortedChildren(categoryRow())).toMatchObject({ children: [] })
  })
})

describe("normalizeCategoryParentId", () => {
  it.each([[null], [""]])("treats %j as no parent", (parentId) => {
    expect(normalizeCategoryParentId(parentId)).toBeUndefined()
  })

  it("keeps a real parent id", () => {
    expect(normalizeCategoryParentId("category-1")).toBe("category-1")
  })

  it("collapses the form's empty selection for mutations", () => {
    expect(normalizeCategoryParentIdForMutation("")).toBeUndefined()
    expect(normalizeCategoryParentIdForMutation(undefined)).toBeUndefined()
    expect(normalizeCategoryParentIdForMutation("category-1")).toBe("category-1")
  })
})

describe("toAdminCategoryListItem", () => {
  it("attaches the parent titles when the category has a parent", () => {
    const item = toAdminCategoryListItem(
      categoryRow({ id: "child", parentId: "parent" }),
      7,
      new Map([["parent", locales("Biżuteria", "Jewellery")]]),
    )

    expect(item.parentTitles).toStrictEqual(locales("Biżuteria", "Jewellery"))
    expect(item.productCount).toBe(7)
  })

  it("leaves the parent titles out for a root category", () => {
    expect(toAdminCategoryListItem(categoryRow(), 0, new Map()).parentTitles).toBeUndefined()
  })

  it("leaves the parent titles out when the parent row was not loaded", () => {
    expect(toAdminCategoryListItem(categoryRow({ parentId: "missing" }), 0, new Map()).parentTitles).toBeUndefined()
  })
})

describe("buildCategoryRankUpdates", () => {
  const categoriesById = new Map([
    ["root-a", { id: "root-a", parentId: null }],
    ["root-b", { id: "root-b", parentId: null }],
    ["child-a", { id: "child-a", parentId: "root-a" }],
    ["child-b", { id: "child-b", parentId: "root-a" }],
  ])

  it("ranks each sibling group independently from zero", () => {
    expect(buildCategoryRankUpdates(["root-b", "child-b", "root-a", "child-a"], categoriesById)).toStrictEqual([
      { id: "root-b", rank: 0 },
      { id: "root-a", rank: 1 },
      { id: "child-b", rank: 0 },
      { id: "child-a", rank: 1 },
    ])
  })

  it("ignores ids that are not in the loaded category set", () => {
    expect(buildCategoryRankUpdates(["ghost", "root-a"], categoriesById)).toStrictEqual([{ id: "root-a", rank: 0 }])
  })

  it("produces nothing for an empty order", () => {
    expect(buildCategoryRankUpdates([], categoriesById)).toStrictEqual([])
  })
})

describe("wouldCreateCategoryParentCycle", () => {
  const categoriesById = new Map([
    ["root", { id: "root", parentId: null }],
    ["child", { id: "child", parentId: "root" }],
    ["grandchild", { id: "grandchild", parentId: "child" }],
  ])

  it("allows reparenting under an unrelated branch", () => {
    expect(wouldCreateCategoryParentCycle("child", "root", categoriesById)).toBe(false)
  })

  it("rejects making a category its own parent", () => {
    expect(wouldCreateCategoryParentCycle("root", "root", categoriesById)).toBe(true)
  })

  it("rejects reparenting a category under its own descendant", () => {
    expect(wouldCreateCategoryParentCycle("root", "grandchild", categoriesById)).toBe(true)
    expect(wouldCreateCategoryParentCycle("child", "grandchild", categoriesById)).toBe(true)
  })

  it("stops at a parent that is not in the loaded set", () => {
    expect(wouldCreateCategoryParentCycle("child", "unknown", categoriesById)).toBe(false)
  })
})

describe("collectDescendantCategoryIds", () => {
  const categories = [
    { id: "root", parentId: null },
    { id: "child-a", parentId: "root" },
    { id: "child-b", parentId: "root" },
    { id: "grandchild", parentId: "child-a" },
    { id: "unrelated", parentId: null },
  ]

  it("includes the root itself and every descendant", () => {
    expect(collectDescendantCategoryIds("root", categories).toSorted()).toStrictEqual(["child-a", "child-b", "grandchild", "root"])
  })

  it("returns just the leaf for a category with no children", () => {
    expect(collectDescendantCategoryIds("grandchild", categories)).toStrictEqual(["grandchild"])
  })

  it("returns the requested id even when it is not in the loaded set", () => {
    expect(collectDescendantCategoryIds("ghost", categories)).toStrictEqual(["ghost"])
  })

  it("treats an empty-string parent as no parent rather than a child of nothing", () => {
    expect(collectDescendantCategoryIds("root", [{ id: "orphan", parentId: "" }])).toStrictEqual(["root"])
  })
})

describe("computeCategoryStats", () => {
  it("averages products per category to one decimal", () => {
    expect(computeCategoryStats({ active: 3, draft: 1, total: 4 }, 10)).toStrictEqual({
      active: 3,
      avgProducts: 2.5,
      draft: 1,
      total: 4,
    })
  })

  it("rounds the average rather than reporting a long fraction", () => {
    expect(computeCategoryStats({ active: 3, draft: 0, total: 3 }, 10).avgProducts).toBe(3.3)
  })

  it("avoids dividing by zero for an empty catalog", () => {
    expect(computeCategoryStats({ active: 0, draft: 0, total: 0 }, 10).avgProducts).toBe(0)
  })

  it("reports zeroes when the count query returned nothing", () => {
    expect(computeCategoryStats(undefined, 10)).toStrictEqual({ active: 0, avgProducts: 0, draft: 0, total: 0 })
  })
})

describe("toCategoryRow", () => {
  const input: ProductCategory["createInput"] = {
    descriptions: locales("", ""),
    handle: "kolczyki",
    image: "",
    parentId: "",
    shortDescriptions: locales(" Krótki ", ""),
    status: CATEGORY_STATUS.ACTIVE,
    subtitles: locales("", ""),
    titles: locales(" Kolczyki ", " Earrings "),
  }

  it("trims the required titles and drops the blank optional maps", () => {
    const row = toCategoryRow(input, "category-1", 3)

    expect(row.titles).toStrictEqual(locales("Kolczyki", "Earrings"))
    expect(row.descriptions).toBeUndefined()
    expect(row.subtitles).toBeUndefined()
    expect(row.shortDescriptions).toStrictEqual(locales("Krótki", ""))
  })

  it("turns the form's empty image and parent selections into absent columns", () => {
    const row = toCategoryRow(input, "category-1", 3)

    expect(row.image).toBeUndefined()
    expect(row.parentId).toBeUndefined()
  })

  it("carries the supplied id and rank through", () => {
    expect(toCategoryRow(input, "category-9", 5)).toMatchObject({ id: "category-9", rank: 5 })
  })

  it("keeps a chosen image and parent category", () => {
    const row = toCategoryRow({ ...input, image: "categories/kolczyki.webp", parentId: "category-root" }, "category-1", 3)

    expect(row.image).toBe("categories/kolczyki.webp")
    expect(row.parentId).toBe("category-root")
  })
})
