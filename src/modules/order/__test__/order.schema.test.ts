import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { order, orderRelations } from "~/src/modules/order/order.schema"

const config = getTableConfig(order)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const relationEntries = Object.entries(orderRelations.config(createTableRelationsHelpers(order)))

const references = config.foreignKeys.map((key) => {
  const reference = key.reference()

  return {
    columns: reference.columns.map((column) => column.name),
    foreignColumns: reference.foreignColumns.map((column) => column.name),
    foreignTable: getTableName(reference.foreignTable),
    onDelete: key.onDelete,
  }
})

describe("order table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("order")
    expect(getTableName(order)).toBe("order")
  })

  it("declares the order columns plus the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "billing_company_name",
      "billing_nip",
      "canceled_at",
      "checkout_id",
      "currency_code",
      "customer_note",
      "delivered_at",
      "delivery_method_id",
      "discount_id",
      "discount_total",
      "email",
      "fulfillment_status",
      "id",
      "locker_id",
      "metadata",
      "order_number",
      "payment_id",
      "shipped_at",
      "shipping_total",
      "status",
      "subtotal",
      "tax_basis_points",
      "tax_total",
      "total",
      "tracking_number",
      "tracking_url",
      "user_id",
      "created_at",
      "updated_at",
    ])
  })

  it("keys an order by a freshly generated uuid", () => {
    const id = columnByName.get("id")
    const generated: unknown = id?.defaultFn?.()

    expect(id?.primary).toBe(true)
    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
    expect(id?.defaultFn?.()).not.toBe(id?.defaultFn?.())
  })

  it("always knows who to email and in which currency to bill", () => {
    expect(columnByName.get("email")?.notNull).toBe(true)
    expect(columnByName.get("email")?.getSQLType()).toBe("text(320)")
    expect(columnByName.get("currency_code")?.notNull).toBe(true)
    expect(columnByName.get("currency_code")?.getSQLType()).toBe("text(3)")
    expect(columnByName.get("currency_code")?.default).toBe("PLN")
  })

  it("opens an order as pending and unfulfilled", () => {
    expect(columnByName.get("status")?.default).toBe("pending")
    expect(columnByName.get("status")?.enumValues).toStrictEqual(["pending", "processing", "completed", "cancelled", "refunded"])
    expect(columnByName.get("fulfillment_status")?.default).toBe("not_fulfilled")
    expect(columnByName.get("fulfillment_status")?.enumValues).toStrictEqual([
      "not_fulfilled",
      "partially_fulfilled",
      "fulfilled",
      "shipped",
      "delivered",
      "cancelled",
    ])
  })

  it.each(["discount_total", "shipping_total", "subtotal", "tax_total", "total"])(
    "starts %s at zero minor units so an order is always priceable",
    (name) => {
      expect(columnByName.get(name)?.default).toBe(0)
      expect(columnByName.get(name)?.notNull).toBe(true)
      expect(columnByName.get(name)?.getSQLType()).toBe("integer")
    },
  )

  it.each(["canceled_at", "delivered_at", "shipped_at"])("keeps %s unset until that moment happens", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(false)
    expect(columnByName.get(name)?.hasDefault).toBe(false)
    expect(columnByName.get(name)?.getSQLType()).toBe("integer")
  })

  it.each(["customer_note", "locker_id", "metadata", "tracking_number", "user_id"])("leaves %s optional", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(false)
  })

  it("stores a tracking url long enough for a courier link", () => {
    expect(columnByName.get("tracking_url")?.getSQLType()).toBe("text(2048)")
  })

  it("keeps a placed order intact when the records it came from disappear", () => {
    expect(references).toStrictEqual([
      { columns: ["checkout_id"], foreignColumns: ["id"], foreignTable: "checkout", onDelete: "set null" },
      { columns: ["delivery_method_id"], foreignColumns: ["id"], foreignTable: "delivery_method", onDelete: "set null" },
      { columns: ["payment_id"], foreignColumns: ["id"], foreignTable: "payment", onDelete: "set null" },
      { columns: ["user_id"], foreignColumns: ["id"], foreignTable: "user", onDelete: "set null" },
    ])
  })

  it("leaves the discount unconstrained so a removed coupon cannot orphan an order", () => {
    expect(references.map((reference) => reference.columns)).not.toContainEqual(["discount_id"])
  })

  it("indexes the lookups the admin list and the account history read by", () => {
    expect(
      config.indexes.map((index) => ({
        columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
        name: index.config.name,
        unique: index.config.unique,
      })),
    ).toStrictEqual([
      { columns: ["user_id"], name: "order_userId_idx", unique: false },
      { columns: ["user_id", "status"], name: "order_userId_status_idx", unique: false },
      { columns: ["status"], name: "order_status_idx", unique: false },
      { columns: ["created_at"], name: "order_createdAt_idx", unique: false },
      { columns: ["checkout_id"], name: "order_checkoutId_unique", unique: true },
      { columns: ["order_number"], name: "order_orderNumber_unique", unique: true },
    ])
  })

  it("gives every order a unique human readable number", () => {
    expect(columnByName.get("order_number")?.notNull).toBe(true)
  })

  it("records the VAT rate the order was priced at rather than assuming today's", () => {
    expect(columnByName.get("tax_basis_points")?.default).toBe(2300)
  })

  it("lets one checkout produce at most one order", () => {
    expect(config.indexes.filter((index) => index.config.unique).map((index) => index.config.name)).toStrictEqual([
      "order_checkoutId_unique",
      "order_orderNumber_unique",
    ])
  })

  it("stamps the order on insert and refreshes it on write", () => {
    expect(columnByName.get("created_at")?.defaultFn?.()).toBeInstanceOf(Date)
    expect(columnByName.get("updated_at")?.onUpdateFn?.()).toBeInstanceOf(Date)
  })
})

describe("order relations", () => {
  it("relates an order to the checkout, delivery, discount, payment and customer behind it", () => {
    expect(relationEntries.map(([name]) => name)).toStrictEqual(["checkout", "deliveryMethod", "discount", "payment", "user"])
  })

  it.each([
    ["checkout", "checkout"],
    ["deliveryMethod", "delivery_method"],
    ["discount", "discount"],
    ["payment", "payment"],
    ["user", "user"],
  ])("points the %s relation at the %s table", (name, table) => {
    expect(relationEntries.filter(([key]) => key === name).map(([, relation]) => getTableName(relation.referencedTable))).toStrictEqual([
      table,
    ])
  })
})
