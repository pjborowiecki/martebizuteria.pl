import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { PRODUCT_OPTION_VALUE_DEFAULT_RANK } from "~/src/modules/product-option-value/product-option-value.constants"
import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema"

const config = getTableConfig(productOptionValue)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("product_option_value table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("product_option_value")
  })

  it("declares the value columns plus the audit timestamps", () => {
    expect(config.columns.map((column) => column.name)).toStrictEqual(["id", "labels", "option_id", "rank", "created_at", "updated_at"])
  })

  it("keys a row by a generated uuid", () => {
    const id = columnByName.get("id")
    const generated: unknown = id?.defaultFn?.()

    expect(id?.primary).toBe(true)
    expect(id?.getSQLType()).toBe(`text(${UUID_STRING_LENGTH})`)
    expect(generated).toBeTypeOf("string")
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
  })

  it("stores the localised labels as required json", () => {
    const labels = columnByName.get("labels")

    expect(labels?.notNull).toBe(true)
    expect(labels?.dataType).toBe("json")
    expect(labels?.hasDefault).toBe(false)
  })

  it("requires the option the value belongs to", () => {
    expect(columnByName.get("option_id")?.notNull).toBe(true)
    expect(columnByName.get("option_id")?.getSQLType()).toBe(`text(${UUID_STRING_LENGTH})`)
  })

  it("defaults the rank so an unordered value still sorts", () => {
    const rank = columnByName.get("rank")

    expect(rank?.notNull).toBe(true)
    expect(rank?.hasDefault).toBe(true)
    expect(rank?.default).toBe(PRODUCT_OPTION_VALUE_DEFAULT_RANK)
    expect(rank?.getSQLType()).toBe("integer")
  })

  it("deletes its values when the option is deleted", () => {
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
    ])
  })

  it("indexes the lookup by option", () => {
    const indexes = config.indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
      unique: index.config.unique,
    }))

    expect(indexes).toStrictEqual([{ columns: ["option_id"], name: "product_option_value_optionId_idx", unique: false }])
  })

  it("keeps no unique constraint, so two options may share a label", () => {
    expect(config.indexes.filter((index) => index.config.unique)).toStrictEqual([])
    expect(config.uniqueConstraints).toStrictEqual([])
  })

  it("refreshes updated_at on every write but leaves created_at alone", () => {
    expect(columnByName.get("created_at")?.onUpdateFn).toBeUndefined()
    expect(columnByName.get("updated_at")?.onUpdateFn?.()).toBeInstanceOf(Date)
  })
})
