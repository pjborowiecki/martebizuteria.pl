import { getTableColumns, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_OPTION_COLUMN_LENGTH } from "~/src/modules/product-option/product-option.constants"
import { productOption } from "~/src/modules/product-option/product-option.schema"

const columns = getTableColumns(productOption)

describe("product option table", () => {
  it("is stored as product_option", () => {
    expect(getTableName(productOption)).toBe("product_option")
  })

  it.each([
    ["id", "id"],
    ["productId", "product_id"],
    ["titles", "titles"],
    ["createdAt", "created_at"],
    ["updatedAt", "updated_at"],
  ] as const)("maps %s onto the %s column", (property, columnName) => {
    expect(columns[property].name).toBe(columnName)
  })

  it("keys a row by its id", () => {
    expect(columns.id.primary).toBe(true)
  })

  it("generates an id when none was supplied", () => {
    expect(columns.id.hasDefault).toBe(true)
  })

  it("requires an owning product and localized titles", () => {
    expect(columns.productId.notNull).toBe(true)
    expect(columns.titles.notNull).toBe(true)
  })

  it("sizes the id and product reference for uuids", () => {
    expect(columns.id.getSQLType()).toBe(`text(${String(PRODUCT_OPTION_COLUMN_LENGTH.id)})`)
    expect(columns.productId.getSQLType()).toBe(`text(${String(PRODUCT_OPTION_COLUMN_LENGTH.productId)})`)
  })

  it("keeps the localized titles as json", () => {
    expect(columns.titles.mapToDriverValue({ "en-US": "Size", "pl-PL": "Rozmiar" })).toBe('{"en-US":"Size","pl-PL":"Rozmiar"}')
  })
})

describe("product option table keys", () => {
  it("generates a uuid for a row that arrives without an id", () => {
    const generated = columns.id.defaultFn?.()

    expect(generated).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/u)
  })

  it("cascades a deleted product onto its options", () => {
    const references = getTableConfig(productOption).foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["product_id"], foreignColumns: ["id"], foreignTable: "product", onDelete: "cascade" }])
  })

  it("indexes the lookup by owning product", () => {
    const indexes = getTableConfig(productOption).indexes.map((index) => ({
      columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: index.config.name,
    }))

    expect(indexes).toStrictEqual([{ columns: ["product_id"], name: "product_option_productId_idx" }])
  })
})
