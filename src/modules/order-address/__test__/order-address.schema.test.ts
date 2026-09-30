import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { orderAddress } from "~/src/modules/order-address/order-address.schema"

const config = getTableConfig(orderAddress)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("order_address table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("order_address")
  })

  it("stores a full postal address plus its role on the order", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "address1",
      "address2",
      "city",
      "country_code",
      "created_at",
      "first_name",
      "id",
      "last_name",
      "order_id",
      "phone",
      "postal_code",
      "province",
      "type",
      "updated_at",
    ])
  })

  it("keys a snapshot by its own id", () => {
    expect(columnByName.get("id")?.primary).toBe(true)
  })

  it.each(["address1", "city", "country_code", "first_name", "last_name", "order_id", "type"])("requires %s", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(true)
  })

  it.each(["address2", "phone", "postal_code", "province"])("treats %s as optional", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(false)
  })

  it("holds the two address roles an order needs", () => {
    expect(columnByName.get("type")?.enumValues).toStrictEqual(["shipping", "billing"])
  })

  it("keeps the country code to its two letter form", () => {
    expect(columnByName.get("country_code")?.getSQLType()).toBe("text(2)")
  })

  it("cascades deletes from the order so no snapshot outlives it", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["order_id"], foreignColumns: ["id"], foreignTable: "order", onDelete: "cascade" }])
  })

  it("indexes the lookups the order pages make", () => {
    const indexes = config.indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
      unique: index.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["order_id"], name: "order_address_orderId_idx", unique: false },
      { columns: ["type"], name: "order_address_type_idx", unique: false },
    ])
  })

  it("stamps every snapshot with both timestamps", () => {
    expect(columnByName.get("created_at")?.hasDefault).toBe(true)
    expect(columnByName.get("updated_at")?.hasDefault).toBe(true)
  })
})

it("generates a fresh UUID for every new row", () => {
  const generateId = columnByName.get("id")?.defaultFn
  const first: unknown = generateId?.()
  const second: unknown = generateId?.()
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
  expect(second).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
  expect(second).not.toBe(first)
})
