import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { INVENTORY_DEFAULT_QUANTITY, INVENTORY_DEFAULT_VERSION } from "~/src/modules/inventory/inventory.constants"
import { inventory } from "~/src/modules/inventory/inventory.schema"

const config = getTableConfig(inventory)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("inventory table", () => {
  it("maps to the inventory table name", () => {
    expect(config.name).toBe("inventory")
  })

  it("declares the stock counters, the variant link and the optimistic version", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "created_at",
      "id",
      "quantity_available",
      "quantity_reserved",
      "updated_at",
      "variant_id",
      "version",
    ])
  })

  it("keys a row by its own generated id", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.hasDefault).toBe(true)
  })

  it("starts both stock counters empty and never allows null", () => {
    for (const name of ["quantity_available", "quantity_reserved"]) {
      const column = columnByName.get(name)

      expect(column?.notNull).toBe(true)
      expect(column?.default).toBe(INVENTORY_DEFAULT_QUANTITY)
      expect(column?.getSQLType()).toBe("integer")
    }
  })

  it("starts the optimistic version at one so a first reservation can compare it", () => {
    const version = columnByName.get("version")

    expect(version?.notNull).toBe(true)
    expect(version?.default).toBe(INVENTORY_DEFAULT_VERSION)
  })

  it("requires the variant it tracks", () => {
    expect(columnByName.get("variant_id")?.notNull).toBe(true)
  })

  it("drops the stock row when its variant is deleted", () => {
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
      { columns: ["variant_id"], foreignColumns: ["id"], foreignTable: "product_variant", onDelete: "cascade" },
    ])
  })

  it("allows a single stock row per variant, which also serves the lookup", () => {
    const indexes = config.indexes.map((entry) => ({
      columns: entry.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: entry.config.name,
      unique: entry.config.unique,
    }))

    expect(indexes).toStrictEqual([{ columns: ["variant_id"], name: "inventory_variantId_unique", unique: true }])
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
