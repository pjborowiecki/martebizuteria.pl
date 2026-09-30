import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { courier, courierRelations } from "~/src/modules/courier/courier.schema"
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"

const config = getTableConfig(courier)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const relationEntries = Object.entries(courierRelations.config(createTableRelationsHelpers(courier)))

describe("courier table", () => {
  it("maps to the courier table name the migrations use", () => {
    expect(config.name).toBe("courier")
  })

  it("declares the carrier columns and the shared timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "id",
      "internal_code",
      "is_active",
      "logo",
      "name",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a courier by its id", () => {
    expect(columnByName.get("id")?.primary).toBe(true)
  })

  it("generates an id when the caller supplies none", () => {
    const id = columnByName.get("id")

    expect(id?.hasDefault).toBe(true)
    expect(typeof id?.defaultFn?.()).toBe("string")
  })

  it("requires a unique internal code so integrations can address a carrier", () => {
    const internalCode = columnByName.get("internal_code")

    expect(internalCode?.notNull).toBe(true)
    expect(internalCode?.isUnique).toBe(true)
  })

  it("requires a display name", () => {
    expect(columnByName.get("name")?.notNull).toBe(true)
  })

  it("treats a new courier as active", () => {
    const isActive = columnByName.get("is_active")

    expect(isActive?.notNull).toBe(true)
    expect(isActive?.hasDefault).toBe(true)
    expect(isActive?.default).toBe(true)
  })

  it("stores the boolean flag as an integer", () => {
    expect(columnByName.get("is_active")?.getSQLType()).toBe("integer")
  })

  it("leaves the logo optional", () => {
    expect(columnByName.get("logo")?.notNull).toBe(false)
  })

  it("stamps both timestamps on insert", () => {
    expect(columnByName.get("created_at")?.hasDefault).toBe(true)
    expect(columnByName.get("updated_at")?.hasDefault).toBe(true)
  })

  it("adds no indexes or foreign keys of its own", () => {
    expect(config.indexes).toStrictEqual([])
    expect(config.foreignKeys).toStrictEqual([])
  })
})

describe("courier relations", () => {
  it("hangs the relations off the courier table", () => {
    expect(getTableName(courierRelations.table)).toBe("courier")
  })

  it("declares only the delivery method side", () => {
    expect(relationEntries.map(([name]) => name)).toStrictEqual(["deliveryMethods"])
  })

  it("points the relation at the delivery method table", () => {
    const [, relation] = relationEntries[0] ?? []

    expect(relation === undefined ? undefined : getTableName(relation.referencedTable)).toBe(getTableName(deliveryMethod))
  })
})
