import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { CATEGORY_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/category-on-product/category-on-product.constants"
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"

const config = getTableConfig(categoryOnProduct)

describe("categoryOnProduct table", () => {
  it("maps to the migrated join table name", () => {
    expect(config.name).toBe("category_on_product")
  })

  it("declares exactly the three migrated columns", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual(["category_id", "is_primary", "product_id"])
  })

  it("requires every column", () => {
    expect(config.columns.every((column) => column.notNull)).toBe(true)
  })

  it("sizes both identifier columns to the owning table's id length", () => {
    expect(categoryOnProduct.categoryId.columnType).toBe("SQLiteText")
    expect(CATEGORY_ON_PRODUCT_COLUMN_LENGTH.categoryId).toBe(36)
    expect(CATEGORY_ON_PRODUCT_COLUMN_LENGTH.productId).toBe(36)
  })

  it("keys a product to a category exactly once, product first", () => {
    const [primaryKey] = config.primaryKeys

    expect(config.primaryKeys).toHaveLength(1)
    expect(primaryKey?.columns.map((column) => column.name)).toStrictEqual(["product_id", "category_id"])
  })

  it("indexes both sides of the join for lookups in either direction", () => {
    expect(config.indexes.map((index) => index.config.name).toSorted()).toStrictEqual([
      "category_on_product_category_id_idx",
      "category_on_product_product_id_idx",
    ])
  })

  it("cascades deletes from both parents so no orphan assignment survives", () => {
    expect(config.foreignKeys).toHaveLength(2)
    expect(config.foreignKeys.every((foreignKey) => foreignKey.onDelete === "cascade")).toBe(true)
  })

  it("points each foreign key at the id of its parent table", () => {
    const references = config.foreignKeys.map((foreignKey) => {
      const { foreignTable, foreignColumns } = foreignKey.reference()

      return `${getTableConfig(foreignTable).name}.${foreignColumns.map((column) => column.name).join(",")}`
    })

    expect(references.toSorted()).toStrictEqual(["product.id", "product_category.id"])
  })
})

describe("categoryOnProduct isPrimary column", () => {
  it("defaults to a non-primary assignment", () => {
    expect(categoryOnProduct.isPrimary.default).toBe(false)
    expect(categoryOnProduct.isPrimary.hasDefault).toBe(true)
  })

  it("stores booleans as sqlite integers", () => {
    expect(categoryOnProduct.isPrimary.mapToDriverValue(true)).toBe(1)
    expect(categoryOnProduct.isPrimary.mapToDriverValue(false)).toBe(0)
  })

  it("reads sqlite integers back as booleans", () => {
    expect(categoryOnProduct.isPrimary.mapFromDriverValue(1)).toBe(true)
    expect(categoryOnProduct.isPrimary.mapFromDriverValue(0)).toBe(false)
  })
})
