import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { priceHistory } from "~/src/modules/price-history/price-history.schema"

const config = getTableConfig(priceHistory)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("price_history table", () => {
  it("maps to the price_history table name", () => {
    expect(config.name).toBe("price_history")
  })

  it("stores which variant sold at which price and compare-at price from when", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "changed_at",
      "compare_at_price",
      "id",
      "price",
      "variant_id",
    ])
  })

  it("orders a variant's prices by an integer key the database assigns in the order they were recorded", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.getSQLType()).toBe("integer")
  })

  it("requires the variant, the price and the moment it took effect, and leaves the compare-at price optional", () => {
    expect(columnByName.get("variant_id")?.notNull).toBe(true)
    expect(columnByName.get("price")?.notNull).toBe(true)
    expect(columnByName.get("changed_at")?.notNull).toBe(true)
    expect(columnByName.get("compare_at_price")?.notNull).toBe(false)
  })

  it("indexes the variant so its history is read without scanning every price", () => {
    expect(config.indexes.map((index) => index.config.name)).toStrictEqual(["price_history_variantId_idx"])
  })

  it("drops a variant's price history with the variant", () => {
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
      { columns: ["variant_id"], foreignColumns: ["id"], foreignTable: "product_variant", onDelete: "cascade" },
    ])
  })
})
