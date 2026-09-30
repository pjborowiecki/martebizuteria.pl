import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { checkout, checkoutRelations } from "~/src/modules/checkout/checkout.schema"

const config = getTableConfig(checkout)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const relationEntries = Object.entries(checkoutRelations.config(createTableRelationsHelpers(checkout)))

const references = config.foreignKeys.map((key) => {
  const reference = key.reference()

  return {
    columns: reference.columns.map((column) => column.name),
    foreignColumns: reference.foreignColumns.map((column) => column.name),
    foreignTable: getTableName(reference.foreignTable),
    onDelete: key.onDelete,
  }
})

const referencedTablesFor = (name: string): string[] =>
  relationEntries.filter(([relationName]) => relationName === name).map(([, relation]) => getTableName(relation.referencedTable))

describe("checkout table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("checkout")
    expect(getTableName(checkout)).toBe("checkout")
  })

  it("declares the checkout columns plus the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "billing_address_id",
      "cart_id",
      "customer_note",
      "delivery_method_id",
      "discount_id",
      "email",
      "id",
      "locker_id",
      "shipping_address_id",
      "status",
      "user_id",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a checkout by a generated uuid", () => {
    const id = columnByName.get("id")
    const generated: unknown = id?.defaultFn?.()

    expect(id?.primary).toBe(true)
    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
  })

  it("generates a fresh key for every checkout", () => {
    const id = columnByName.get("id")

    expect(id?.defaultFn?.()).not.toBe(id?.defaultFn?.())
  })

  it("always needs an email address to send the confirmation to", () => {
    const email = columnByName.get("email")

    expect(email?.notNull).toBe(true)
    expect(email?.getSQLType()).toBe("text(320)")
  })

  it("starts a checkout as pending and never leaves the status blank", () => {
    const status = columnByName.get("status")

    expect(status?.default).toBe("pending")
    expect(status?.notNull).toBe(true)
    expect(status?.enumValues).toStrictEqual(["pending", "processing", "completed", "failed", "abandoned"])
  })

  it("lets a guest check out without an account", () => {
    expect(columnByName.get("user_id")?.notNull).toBe(false)
    expect(columnByName.get("email")?.notNull).toBe(true)
  })

  it("keeps the checkout row when the account, basket, delivery method or either address is deleted", () => {
    expect(references).toStrictEqual([
      { columns: ["billing_address_id"], foreignColumns: ["id"], foreignTable: "address", onDelete: "set null" },
      { columns: ["cart_id"], foreignColumns: ["id"], foreignTable: "cart", onDelete: "set null" },
      { columns: ["delivery_method_id"], foreignColumns: ["id"], foreignTable: "delivery_method", onDelete: "set null" },
      { columns: ["shipping_address_id"], foreignColumns: ["id"], foreignTable: "address", onDelete: "set null" },
      { columns: ["user_id"], foreignColumns: ["id"], foreignTable: "user", onDelete: "set null" },
    ])
  })

  it("leaves the discount unconstrained so a removed coupon cannot orphan a checkout", () => {
    expect(references.map((reference) => reference.columns)).not.toContainEqual(["discount_id"])
  })

  it("keeps the locker choice as free text because the carrier owns those ids", () => {
    const locker = columnByName.get("locker_id")

    expect(locker?.getSQLType()).toBe("text")
    expect(locker?.notNull).toBe(false)
  })

  it("stamps the checkout on insert and refreshes it on update", () => {
    expect(columnByName.get("created_at")?.defaultFn?.()).toBeInstanceOf(Date)
    expect(columnByName.get("updated_at")?.onUpdateFn?.()).toBeInstanceOf(Date)
  })

  it("indexes the three lookups a checkout is read by", () => {
    expect(config.indexes.map((index) => index.config.columns.map((column) => ("name" in column ? column.name : column)))).toStrictEqual([
      ["cart_id"],
      ["user_id"],
      ["status"],
    ])
  })
})

describe("checkout relations", () => {
  it("relates a checkout to its basket, addresses, delivery method, discount and owner", () => {
    expect(relationEntries.map(([name]) => name)).toStrictEqual([
      "billingAddress",
      "cart",
      "deliveryMethod",
      "discount",
      "shippingAddress",
      "user",
    ])
  })

  it("points both address relations at the address table", () => {
    expect(referencedTablesFor("billingAddress")).toStrictEqual(["address"])
    expect(referencedTablesFor("shippingAddress")).toStrictEqual(["address"])
  })

  it("points the basket relation at the cart table", () => {
    expect(referencedTablesFor("cart")).toStrictEqual(["cart"])
  })

  it("points the delivery method relation at the delivery method table", () => {
    expect(referencedTablesFor("deliveryMethod")).toStrictEqual(["delivery_method"])
  })

  it("points the discount relation at the discount table", () => {
    expect(referencedTablesFor("discount")).toStrictEqual(["discount"])
  })

  it("points the owner relation at the user table", () => {
    expect(referencedTablesFor("user")).toStrictEqual(["user"])
  })
})
