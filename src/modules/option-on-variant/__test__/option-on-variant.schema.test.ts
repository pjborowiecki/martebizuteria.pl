import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema"

const config = getTableConfig(optionOnVariant)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("option_on_variant table", () => {
  it("maps to the join table name the migrations use", () => {
    expect(config.name).toBe("option_on_variant")
  })

  it("declares the join columns plus the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual([
      "id",
      "option_id",
      "value_id",
      "variant_id",
      "created_at",
      "updated_at",
    ])
  })

  it("keys a row by its own generated id", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(config.primaryKeys).toStrictEqual([])
    expect(id?.getSQLType()).toBe(`text(${UUID_STRING_LENGTH})`)
  })

  it("generates a uuid for a row that arrives without an id", () => {
    const generated: unknown = columnByName.get("id")?.defaultFn?.()

    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
  })

  it.each(["option_id", "value_id", "variant_id"])("requires %s", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(true)
  })

  it("sizes every foreign key column for a uuid", () => {
    for (const name of ["option_id", "value_id", "variant_id"]) {
      expect(columnByName.get(name)?.getSQLType()).toBe(`text(${UUID_STRING_LENGTH})`)
    }
  })

  it("cascades deletes from the option, the value and the variant", () => {
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
      { columns: ["option_id"], foreignColumns: ["id"], foreignTable: "product_option", onDelete: "cascade" },
      { columns: ["value_id"], foreignColumns: ["id"], foreignTable: "product_option_value", onDelete: "cascade" },
      { columns: ["variant_id"], foreignColumns: ["id"], foreignTable: "product_variant", onDelete: "cascade" },
    ])
  })

  it("lets a variant hold only one value per option", () => {
    const indexes = config.indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
      unique: index.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["option_id"], name: "option_on_variant_optionId_idx", unique: false },
      { columns: ["value_id"], name: "option_on_variant_valueId_idx", unique: false },
      { columns: ["variant_id"], name: "option_on_variant_variantId_idx", unique: false },
      { columns: ["variant_id", "option_id"], name: "option_on_variant_variant_option_unique", unique: true },
    ])
  })

  it("stamps both timestamps on insert and refreshes updated_at on write", () => {
    const createdAt = columnByName.get("created_at")
    const updatedAt = columnByName.get("updated_at")

    expect(createdAt?.notNull).toBe(true)
    expect(createdAt?.hasDefault).toBe(true)
    expect(createdAt?.onUpdateFn).toBeUndefined()
    expect(updatedAt?.onUpdateFn?.()).toBeInstanceOf(Date)
  })
})
