import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { discount } from "~/src/modules/discount/discount.schema"

const config = getTableConfig(discount)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("discount table", () => {
  it("maps to the discount table name", () => {
    expect(config.name).toBe("discount")
  })

  it("declares the code, window, limits and value columns", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "code",
      "created_at",
      "description",
      "ends_at",
      "id",
      "is_active",
      "max_discount_amount",
      "min_order_total",
      "per_customer_limit",
      "starts_at",
      "type",
      "updated_at",
      "usage_count",
      "usage_limit",
      "value",
    ])
  })

  it("keys a row by its own generated id", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.hasDefault).toBe(true)
  })

  it("generates an id when the caller supplies none", () => {
    expect(typeof columnByName.get("id")?.defaultFn?.()).toBe("string")
  })

  it("requires a unique code so two discounts cannot collide", () => {
    const code = columnByName.get("code")

    expect(code?.notNull).toBe(true)
    expect(code?.isUnique).toBe(true)
  })

  it("accepts only the three supported discount types", () => {
    expect(columnByName.get("type")?.enumValues).toStrictEqual(["percentage", "fixed_amount", "free_shipping"])
    expect(columnByName.get("type")?.notNull).toBe(true)
  })

  it("activates a new discount by default", () => {
    const isActive = columnByName.get("is_active")

    expect(isActive?.notNull).toBe(true)
    expect(isActive?.default).toBe(true)
  })

  it("starts the usage count at zero", () => {
    const usageCount = columnByName.get("usage_count")

    expect(usageCount?.notNull).toBe(true)
    expect(usageCount?.default).toBe(0)
  })

  it("treats an absent usage limit as unlimited rather than zero", () => {
    const usageLimit = columnByName.get("usage_limit")

    expect(usageLimit?.notNull).toBe(false)
    expect(usageLimit?.hasDefault).toBe(false)
  })

  it("requires a value but leaves the validity window open ended", () => {
    expect(columnByName.get("value")?.notNull).toBe(true)
    expect(columnByName.get("starts_at")?.notNull).toBe(false)
    expect(columnByName.get("ends_at")?.notNull).toBe(false)
  })

  it("stores the discount value and the window as integers", () => {
    expect(columnByName.get("value")?.getSQLType()).toBe("integer")
    expect(columnByName.get("starts_at")?.getSQLType()).toBe("integer")
  })

  it("owns no foreign keys because carts and orders point at it", () => {
    expect(config.foreignKeys).toStrictEqual([])
  })

  it("indexes the code lookup used at checkout", () => {
    const indexes = config.indexes.map((entry) => ({
      columns: entry.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: entry.config.name,
      unique: entry.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["code"], name: "discount_code_idx", unique: false },
      { columns: ["is_active"], name: "discount_isActive_idx", unique: false },
    ])
  })
})
