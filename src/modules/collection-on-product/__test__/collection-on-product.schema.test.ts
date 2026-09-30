import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"

const config = getTableConfig(collectionOnProduct)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("collection_on_product table", () => {
  it("maps to the join table name the migrations use", () => {
    expect(config.name).toBe("collection_on_product")
  })

  it("declares only the join columns", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual(["collection_id", "product_id", "rank"])
  })

  it.each(["collection_id", "product_id"])("requires %s", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(true)
  })

  it("defaults the rank to zero so an unordered row still sorts", () => {
    const rank = columnByName.get("rank")

    expect(rank?.notNull).toBe(true)
    expect(rank?.hasDefault).toBe(true)
    expect(rank?.default).toBe(0)
  })

  it("keys a row by product and collection together", () => {
    expect(config.primaryKeys.map((key) => key.columns.map((column) => column.name))).toStrictEqual([["product_id", "collection_id"]])
  })

  it("has no single-column primary key", () => {
    expect(config.columns.filter((column) => column.primary)).toStrictEqual([])
  })

  it("cascades deletes from both parents so no orphan join rows remain", () => {
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
      { columns: ["collection_id"], foreignColumns: ["id"], foreignTable: "product_collection", onDelete: "cascade" },
      { columns: ["product_id"], foreignColumns: ["id"], foreignTable: "product", onDelete: "cascade" },
    ])
  })

  it("indexes both lookup directions and the ordered collection read", () => {
    const indexes = config.indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
      unique: index.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["collection_id"], name: "collection_on_product_collection_id_idx", unique: false },
      { columns: ["collection_id", "rank"], name: "collection_on_product_collection_rank_idx", unique: false },
      { columns: ["product_id"], name: "collection_on_product_product_id_idx", unique: false },
    ])
  })
})
