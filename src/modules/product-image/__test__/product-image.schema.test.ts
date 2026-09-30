import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_IMAGE_DEFAULT_RANK } from "~/src/modules/product-image/product-image.constants"
import { productImage } from "~/src/modules/product-image/product-image.schema"

const config = getTableConfig(productImage)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

describe("product_image table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("product_image")
  })

  it("declares the image columns together with the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "alt",
      "id",
      "product_id",
      "rank",
      "url",
      "variant_id",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a row by its own id", () => {
    expect(columnByName.get("id")?.primary).toBe(true)
  })

  it("generates a fresh uuid for every row inserted without an id", () => {
    const generatedIds = [String(columnByName.get("id")?.defaultFn?.()), String(columnByName.get("id")?.defaultFn?.())]

    expect(generatedIds[0]).toMatch(UUID_PATTERN)
    expect(generatedIds[1]).toMatch(UUID_PATTERN)
    expect(generatedIds[0]).not.toBe(generatedIds[1])
  })

  it("requires the product, the url and the rank", () => {
    expect(columnByName.get("product_id")?.notNull).toBe(true)
    expect(columnByName.get("url")?.notNull).toBe(true)
    expect(columnByName.get("rank")?.notNull).toBe(true)
  })

  it("leaves the alt text and the variant optional, since an image may describe the whole product", () => {
    expect(columnByName.get("alt")?.notNull).toBe(false)
    expect(columnByName.get("variant_id")?.notNull).toBe(false)
  })

  it("ranks an image that was stored without a position last-in-first", () => {
    expect(columnByName.get("rank")?.hasDefault).toBe(true)
    expect(columnByName.get("rank")?.default).toBe(PRODUCT_IMAGE_DEFAULT_RANK)
  })

  it("drops the images of a deleted product and of a deleted variant", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([
      { columns: ["product_id"], foreignColumns: ["id"], foreignTable: "product", onDelete: "cascade" },
      { columns: ["variant_id"], foreignColumns: ["id"], foreignTable: "product_variant", onDelete: "cascade" },
    ])
  })

  it("indexes the ordered reads of both galleries", () => {
    const indexes = config.indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
      unique: index.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["product_id", "rank"], name: "product_image_productId_rank_idx", unique: false },
      { columns: ["variant_id", "rank"], name: "product_image_variantId_rank_idx", unique: false },
    ])
  })

  it("stamps both timestamps on an insert", () => {
    expect(columnByName.get("created_at")?.defaultFn?.()).toBeInstanceOf(Date)
    expect(columnByName.get("updated_at")?.defaultFn?.()).toBeInstanceOf(Date)
  })
})
