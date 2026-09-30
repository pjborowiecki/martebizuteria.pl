import { describe, expect, it } from "vite-plus/test"

import {
  buildCategoryOnProductRows,
  resolveAdditionalCategoryIds,
  resolvePrimaryCategoryId,
} from "~/src/modules/category-on-product/category-on-product.utils"

describe("resolvePrimaryCategoryId", () => {
  it("prefers the assignment flagged as primary", () => {
    expect(
      resolvePrimaryCategoryId([
        { categoryId: "cat-a", isPrimary: false },
        { categoryId: "cat-b", isPrimary: true },
      ]),
    ).toBe("cat-b")
  })

  it("falls back to the first assignment when none is flagged", () => {
    expect(
      resolvePrimaryCategoryId([
        { categoryId: "cat-a", isPrimary: false },
        { categoryId: "cat-b", isPrimary: false },
      ]),
    ).toBe("cat-a")
  })

  it("reports nothing for an uncategorised product", () => {
    expect(resolvePrimaryCategoryId([])).toBeUndefined()
  })
})

describe("resolveAdditionalCategoryIds", () => {
  it("excludes whichever assignment is the primary one", () => {
    expect(
      resolveAdditionalCategoryIds([
        { categoryId: "cat-a", isPrimary: false },
        { categoryId: "cat-b", isPrimary: true },
        { categoryId: "cat-c", isPrimary: false },
      ]),
    ).toStrictEqual(["cat-a", "cat-c"])
  })

  it("excludes the implicit primary when none is flagged", () => {
    expect(
      resolveAdditionalCategoryIds([
        { categoryId: "cat-a", isPrimary: false },
        { categoryId: "cat-b", isPrimary: false },
      ]),
    ).toStrictEqual(["cat-b"])
  })

  it("is empty for an uncategorised product", () => {
    expect(resolveAdditionalCategoryIds([])).toStrictEqual([])
  })
})

describe("buildCategoryOnProductRows", () => {
  it("flags exactly one row as primary", () => {
    const rows = buildCategoryOnProductRows("product-1", "cat-a", ["cat-b", "cat-c"])

    expect(rows.filter((row) => row.isPrimary === true)).toHaveLength(1)
    expect(rows[0]).toStrictEqual({ categoryId: "cat-a", isPrimary: true, productId: "product-1" })
  })

  it("never writes the primary category twice", () => {
    expect(buildCategoryOnProductRows("product-1", "cat-a", ["cat-a", "cat-b"]).map((row) => row.categoryId)).toStrictEqual([
      "cat-a",
      "cat-b",
    ])
  })

  it("de-duplicates the additional categories", () => {
    expect(buildCategoryOnProductRows("product-1", "cat-a", ["cat-b", "cat-b"]).map((row) => row.categoryId)).toStrictEqual([
      "cat-a",
      "cat-b",
    ])
  })

  it("writes just the primary row when there are no additional categories", () => {
    expect(buildCategoryOnProductRows("product-1", "cat-a", [])).toHaveLength(1)
  })

  it("round trips through the resolvers", () => {
    const assignments = buildCategoryOnProductRows("product-1", "cat-a", ["cat-b", "cat-c"]).map((row) => ({
      categoryId: row.categoryId,
      isPrimary: row.isPrimary ?? false,
    }))

    expect(resolvePrimaryCategoryId(assignments)).toBe("cat-a")
    expect(resolveAdditionalCategoryIds(assignments)).toStrictEqual(["cat-b", "cat-c"])
  })
})
