import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { cart, cartRelations } from "~/src/modules/cart/cart.schema"

const config = getTableConfig(cart)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const relationEntries = Object.entries(cartRelations.config(createTableRelationsHelpers(cart)))

describe("cart table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("cart")
    expect(getTableName(cart)).toBe("cart")
  })

  it("declares the basket columns plus the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "discount_id",
      "expires_at",
      "id",
      "session_id",
      "user_id",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a basket by a generated uuid", () => {
    const id = columnByName.get("id")
    const generated: unknown = id?.defaultFn?.()

    expect(id?.primary).toBe(true)
    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
  })

  it("generates a fresh key for every basket", () => {
    const id = columnByName.get("id")

    expect(id?.defaultFn?.()).not.toBe(id?.defaultFn?.())
  })

  it("lets a basket belong to nobody so a guest can shop", () => {
    expect(columnByName.get("user_id")?.notNull).toBe(false)
    expect(columnByName.get("session_id")?.notNull).toBe(false)
  })

  it("keeps the basket when the customer account is deleted", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["user_id"], foreignColumns: ["id"], foreignTable: "user", onDelete: "set null" }])
  })

  it("leaves the discount unconstrained so a removed coupon cannot orphan a basket", () => {
    expect(config.foreignKeys.map((key) => key.reference().columns.map((column) => column.name))).not.toContainEqual(["discount_id"])
  })

  it("stores the expiry as a millisecond timestamp with no default", () => {
    const expiresAt = columnByName.get("expires_at")

    expect(expiresAt?.getSQLType()).toBe("integer")
    expect(expiresAt?.hasDefault).toBe(false)
  })

  it("stamps the basket on insert and refreshes it on update", () => {
    expect(columnByName.get("created_at")?.defaultFn?.()).toBeInstanceOf(Date)
    expect(columnByName.get("updated_at")?.onUpdateFn?.()).toBeInstanceOf(Date)
  })

  it("indexes both lookups the cart is read by", () => {
    expect(config.indexes.map((index) => index.config.columns.map((column) => ("name" in column ? column.name : column)))).toStrictEqual([
      ["user_id"],
      ["session_id"],
    ])
  })
})

describe("cart relations", () => {
  it("relates a basket to its owner, its discount and its lines", () => {
    expect(relationEntries.map(([name]) => name)).toStrictEqual(["discount", "items", "user"])
  })

  it("points the owner relation at the user table", () => {
    expect(relationEntries.filter(([name]) => name === "user").map(([, relation]) => getTableName(relation.referencedTable))).toStrictEqual(
      ["user"],
    )
  })

  it("points the discount relation at the discount table", () => {
    expect(
      relationEntries.filter(([name]) => name === "discount").map(([, relation]) => getTableName(relation.referencedTable)),
    ).toStrictEqual(["discount"])
  })

  it("holds many lines", () => {
    expect(
      relationEntries.filter(([name]) => name === "items").map(([, relation]) => getTableName(relation.referencedTable)),
    ).toStrictEqual(["cart_item"])
  })
})
