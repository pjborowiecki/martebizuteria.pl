import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { orderItem } from "~/src/modules/order-item/order-item.schema"

const config = getTableConfig(orderItem)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("order_item table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("order_item")
  })

  it("declares the captured line columns plus the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "id",
      "metadata",
      "order_id",
      "product_id",
      "quantity",
      "subtotal",
      "thumbnail",
      "title",
      "total",
      "unit_price",
      "variant_id",
      "variant_title",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a row by its own generated id", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(config.primaryKeys).toStrictEqual([])
  })

  it("generates a uuid for a line that arrives without an id", () => {
    const generated: unknown = columnByName.get("id")?.defaultFn?.()

    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
  })

  it.each(["order_id", "quantity", "subtotal", "title", "total", "unit_price"])("requires %s so a line can always be priced", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(true)
  })

  it.each(["metadata", "product_id", "thumbnail", "variant_id", "variant_title"])(
    "leaves %s optional so a historical line survives catalog changes",
    (name) => {
      expect(columnByName.get(name)?.notNull).toBe(false)
    },
  )

  it.each(["quantity", "subtotal", "total", "unit_price"])("stores %s as an integer of minor units", (name) => {
    expect(columnByName.get(name)?.getSQLType()).toBe("integer")
  })

  it("keeps the captured titles within the storable text lengths", () => {
    expect(columnByName.get("title")?.getSQLType()).toBe("text(512)")
    expect(columnByName.get("variant_title")?.getSQLType()).toBe("text(512)")
    expect(columnByName.get("thumbnail")?.getSQLType()).toBe("text(2048)")
  })

  it("removes its lines with the order but keeps them when a variant disappears", () => {
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
      { columns: ["order_id"], foreignColumns: ["id"], foreignTable: "order", onDelete: "cascade" },
      { columns: ["variant_id"], foreignColumns: ["id"], foreignTable: "product_variant", onDelete: "set null" },
    ])
  })

  it("indexes the order so a detail page reads its lines in one lookup, and the variant so removing one never scans every line", () => {
    const indexes = config.indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
      unique: index.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["order_id"], name: "order_item_orderId_idx", unique: false },
      { columns: ["variant_id"], name: "order_item_variantId_idx", unique: false },
    ])
  })

  it("does not reference the product it was bought from, so deleting a product keeps history", () => {
    expect(config.foreignKeys.some((key) => key.reference().columns.some((column) => column.name === "product_id"))).toBe(false)
  })

  it("stamps both timestamps on insert and refreshes updated_at on write", () => {
    const createdAt = columnByName.get("created_at")
    const updatedAt = columnByName.get("updated_at")

    expect(createdAt?.notNull).toBe(true)
    expect(createdAt?.hasDefault).toBe(true)
    expect(updatedAt?.onUpdateFn?.()).toBeInstanceOf(Date)
  })
})
