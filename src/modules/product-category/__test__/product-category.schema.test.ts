import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { CATEGORY_DEFAULT_RANK, DEFAULT_CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"

const config = getTableConfig(productCategory)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("product category table", () => {
  it("maps to the product_category table name", () => {
    expect(config.name).toBe("product_category")
  })

  it("declares the localized copy, the tree link and the ordering rank", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "created_at",
      "descriptions",
      "handle",
      "id",
      "image",
      "metadata",
      "parent_id",
      "rank",
      "short_descriptions",
      "status",
      "subtitles",
      "titles",
      "updated_at",
    ])
  })

  it("keys a row by an id the caller supplies", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.hasDefault).toBe(false)
  })

  it("requires a unique handle so two categories cannot share a url", () => {
    const handle = columnByName.get("handle")

    expect(handle?.notNull).toBe(true)
    expect(handle?.isUnique).toBe(true)
  })

  it("requires the titles map and leaves the other copy optional", () => {
    expect(columnByName.get("titles")?.notNull).toBe(true)

    for (const name of ["subtitles", "short_descriptions", "descriptions", "image"]) {
      expect(columnByName.get(name)?.notNull).toBe(false)
    }
  })

  it("starts a new category as a draft at the default rank", () => {
    expect(columnByName.get("status")?.default).toBe(DEFAULT_CATEGORY_STATUS)
    expect(columnByName.get("status")?.notNull).toBe(true)
    expect(columnByName.get("rank")?.default).toBe(CATEGORY_DEFAULT_RANK)
    expect(columnByName.get("rank")?.notNull).toBe(true)
  })

  it("accepts only the supported category statuses", () => {
    expect(columnByName.get("status")?.enumValues).toStrictEqual(["draft", "active"])
  })

  it("keeps a root category without a parent", () => {
    expect(columnByName.get("parent_id")?.notNull).toBe(false)
  })

  it("promotes the children of a deleted category to roots instead of deleting them", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["parent_id"], foreignTable: "product_category", onDelete: "set null" }])
  })

  it("indexes the ordered reads of a branch, with and without a status filter", () => {
    const indexes = config.indexes.map((entry) => ({
      columns: entry.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: entry.config.name,
      unique: entry.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["parent_id", "rank"], name: "product_category_parent_rank_idx", unique: false },
      { columns: ["status", "parent_id", "rank"], name: "product_category_status_parent_rank_idx", unique: false },
    ])
  })
})
