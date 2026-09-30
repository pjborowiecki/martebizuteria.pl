import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { checkout } from "~/src/modules/checkout/checkout.schema"
import { courier } from "~/src/modules/courier/courier.schema"
import { deliveryMethod, deliveryMethodRelations } from "~/src/modules/delivery-method/delivery-method.schema"
import { order } from "~/src/modules/order/order.schema"

const config = getTableConfig(deliveryMethod)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const relationEntries = Object.entries(deliveryMethodRelations.config(createTableRelationsHelpers(deliveryMethod)))

const relationByName = new Map(relationEntries)

const referencedTableName = (name: string): string | undefined => {
  const relation = relationByName.get(name)

  return relation === undefined ? undefined : getTableName(relation.referencedTable)
}

describe("delivery method table", () => {
  it("maps to the delivery method table name the migrations use", () => {
    expect(config.name).toBe("delivery_method")
  })

  it("declares the shipping option columns and the shared timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "api_service_code",
      "courier_id",
      "description",
      "id",
      "is_active",
      "name",
      "price",
      "type",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a delivery method by its id", () => {
    expect(columnByName.get("id")?.primary).toBe(true)
  })

  it("generates an id when the caller supplies none", () => {
    const id = columnByName.get("id")

    expect(id?.hasDefault).toBe(true)
    expect(typeof id?.defaultFn?.()).toBe("string")
  })

  it("requires the carrier's own service code so the integration can book the shipment", () => {
    expect(columnByName.get("api_service_code")?.notNull).toBe(true)
  })

  it("requires a display name and a price", () => {
    expect(columnByName.get("name")?.notNull).toBe(true)
    expect(columnByName.get("price")?.notNull).toBe(true)
  })

  it("stores the price as whole minor units", () => {
    expect(columnByName.get("price")?.getSQLType()).toBe("integer")
  })

  it("leaves the description optional", () => {
    expect(columnByName.get("description")?.notNull).toBe(false)
  })

  it("treats a new delivery method as active", () => {
    const isActive = columnByName.get("is_active")

    expect(isActive?.notNull).toBe(true)
    expect(isActive?.hasDefault).toBe(true)
    expect(isActive?.default).toBe(true)
  })

  it("accepts only the three shipping shapes the checkout offers", () => {
    expect(columnByName.get("type")?.enumValues).toStrictEqual(["locker", "courier", "in_store"])
    expect(columnByName.get("type")?.notNull).toBe(true)
  })

  it("stamps both timestamps on insert", () => {
    expect(columnByName.get("created_at")?.hasDefault).toBe(true)
    expect(columnByName.get("updated_at")?.hasDefault).toBe(true)
  })

  it("removes a delivery method with the carrier that offered it", () => {
    const [foreignKey] = config.foreignKeys
    const reference = foreignKey?.reference()

    expect(config.foreignKeys).toHaveLength(1)
    expect(foreignKey?.onDelete).toBe("cascade")
    expect(reference?.columns.map((column) => column.name)).toStrictEqual(["courier_id"])
    expect(reference?.foreignColumns.map((column) => column.name)).toStrictEqual(["id"])
    expect(reference === undefined ? undefined : getTableName(reference.foreignTable)).toBe(getTableName(courier))
  })

  it("requires the carrier a delivery method belongs to", () => {
    expect(columnByName.get("courier_id")?.notNull).toBe(true)
  })
})

describe("delivery method relations", () => {
  it("hangs the relations off the delivery method table", () => {
    expect(getTableName(deliveryMethodRelations.table)).toBe("delivery_method")
  })

  it("reaches the carrier, the checkouts and the orders that chose it", () => {
    expect(relationEntries.map(([name]) => name)).toStrictEqual(["checkouts", "courier", "orders"])
  })

  it("points each relation at the table that owns the other side", () => {
    expect(referencedTableName("courier")).toBe(getTableName(courier))
    expect(referencedTableName("checkouts")).toBe(getTableName(checkout))
    expect(referencedTableName("orders")).toBe(getTableName(order))
  })
})
