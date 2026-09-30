import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { cartItem, cartItemRelations } from "~/src/modules/cart-item/cart-item.schema"

const config = getTableConfig(cartItem)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const relationEntries = Object.entries(cartItemRelations.config(createTableRelationsHelpers(cartItem)))

describe("cart_item table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("cart_item")
    expect(getTableName(cartItem)).toBe("cart_item")
  })

  it("declares the line columns plus the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "added_at",
      "cart_id",
      "id",
      "quantity",
      "variant_id",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a line by a generated uuid", () => {
    const id = columnByName.get("id")
    const generated: unknown = id?.defaultFn?.()

    expect(id?.primary).toBe(true)
    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
  })

  it("requires both the cart and the variant a line points at", () => {
    expect(columnByName.get("cart_id")?.notNull).toBe(true)
    expect(columnByName.get("variant_id")?.notNull).toBe(true)
  })

  it("defaults a line to a single unit and never leaves the quantity unset", () => {
    const quantity = columnByName.get("quantity")

    expect(quantity?.notNull).toBe(true)
    expect(quantity?.default).toBe(1)
    expect(quantity?.getSQLType()).toBe("integer")
  })

  it("stamps added_at on insert as a millisecond timestamp", () => {
    const addedAt = columnByName.get("added_at")

    expect(addedAt?.notNull).toBe(true)
    expect(addedAt?.hasDefault).toBe(true)
    expect(addedAt?.defaultFn?.()).toBeInstanceOf(Date)
    expect(addedAt?.getSQLType()).toBe("integer")
  })

  it("does not refresh added_at when the line is updated", () => {
    expect(columnByName.get("added_at")?.onUpdateFn).toBeUndefined()
    expect(columnByName.get("updated_at")?.onUpdateFn?.()).toBeInstanceOf(Date)
  })

  it("removes its lines when the cart or the variant is deleted", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([
      { columns: ["cart_id"], foreignTable: "cart", onDelete: "cascade" },
      { columns: ["variant_id"], foreignTable: "product_variant", onDelete: "cascade" },
    ])
  })

  it("indexes both lookups a cart page needs", () => {
    const indexes = config.indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
      unique: index.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["cart_id"], name: "cartItem_cartId_idx", unique: false },
      { columns: ["variant_id"], name: "cartItem_variantId_idx", unique: false },
    ])
  })

  it("allows the same variant to appear in two different carts", () => {
    expect(config.uniqueConstraints).toStrictEqual([])
    expect(config.indexes.filter((index) => index.config.unique)).toStrictEqual([])
  })
})

describe("cart_item relations", () => {
  it("relates a line to exactly one cart and one variant", () => {
    expect(relationEntries.map(([name]) => name)).toStrictEqual(["cart", "variant"])
  })

  it("joins each relation on the foreign key the table declares", () => {
    const joins = relationEntries.map(([name, relation]) => ({
      fields: relation.config?.fields.map((field) => field.name),
      name,
      references: relation.config?.references.map((field) => field.name),
      table: getTableName(relation.referencedTable),
    }))

    expect(joins).toStrictEqual([
      { fields: ["cart_id"], name: "cart", references: ["id"], table: "cart" },
      { fields: ["variant_id"], name: "variant", references: ["id"], table: "product_variant" },
    ])
  })
})
