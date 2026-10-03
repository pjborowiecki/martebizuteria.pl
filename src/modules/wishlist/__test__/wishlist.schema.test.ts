import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { wishlistItem } from "~/src/modules/wishlist/wishlist.schema"

const config = getTableConfig(wishlistItem)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

afterEach(() => {
  vi.restoreAllMocks()
})

describe("wishlist_item table", () => {
  it("maps to the wishlist_item table name", () => {
    expect(config.name).toBe("wishlist_item")
  })

  it("stores which customer saved which product and when", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "created_at",
      "id",
      "product_id",
      "updated_at",
      "user_id",
    ])
  })

  it("requires both the customer and the product", () => {
    expect(columnByName.get("user_id")?.notNull).toBe(true)
    expect(columnByName.get("product_id")?.notNull).toBe(true)
  })

  it("keys a new row by a freshly generated UUID", () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue("0199bb55-3f5e-4aaa-8c4e-d4f5a6b7c8d9")
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.defaultFn?.()).toBe("0199bb55-3f5e-4aaa-8c4e-d4f5a6b7c8d9")
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it("drops the saved row when either the customer or the product is deleted", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references.toSorted((left, right) => left.foreignTable.localeCompare(right.foreignTable))).toStrictEqual([
      { columns: ["product_id"], foreignColumns: ["id"], foreignTable: "product", onDelete: "cascade" },
      { columns: ["user_id"], foreignColumns: ["id"], foreignTable: "user", onDelete: "cascade" },
    ])
  })

  it("lets a product be saved once per customer and lists a customer's saves by date", () => {
    const indexes = config.indexes.map((entry) => ({
      columns: entry.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: entry.config.name,
      unique: entry.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["user_id", "product_id"], name: "wishlist_item_userId_productId_unique", unique: true },
      { columns: ["user_id", "created_at"], name: "wishlist_item_userId_createdAt_idx", unique: false },
    ])
  })
})
