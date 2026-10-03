import { getTableName } from "drizzle-orm"
import { SQLiteColumn, SQLiteSyncDialect, getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { ATTRIBUTE_ON_PRODUCT_DEFAULT_RANK } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"

const config = getTableConfig(attributeOnProduct)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("attribute_on_product table", () => {
  it("maps to the join table name the migrations use", () => {
    expect(config.name).toBe("attribute_on_product")
  })

  it("declares the scope, value and ordering columns", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "attribute_id",
      "created_at",
      "id",
      "product_id",
      "rank",
      "updated_at",
      "value",
      "variant_id",
    ])
  })

  it("keys a row by its own generated id", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.hasDefault).toBe(true)
  })

  it.each(["attribute_id", "product_id", "value", "rank"])("requires %s", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(true)
  })

  it("leaves the variant id null for a product level value", () => {
    expect(columnByName.get("variant_id")?.notNull).toBe(false)
  })

  it("defaults the rank to the shared constant", () => {
    expect(columnByName.get("rank")?.default).toBe(ATTRIBUTE_ON_PRODUCT_DEFAULT_RANK)
  })

  it("cascades from the product and variant but refuses to drop an attribute still in use", () => {
    const references = config.foreignKeys
      .map((key) => {
        const reference = key.reference()

        return {
          columns: reference.columns.map((column) => column.name),
          foreignTable: getTableName(reference.foreignTable),
          onDelete: key.onDelete,
        }
      })
      .toSorted((left, right) => left.foreignTable.localeCompare(right.foreignTable))

    expect(references).toStrictEqual([
      { columns: ["product_id"], foreignTable: "product", onDelete: "cascade" },
      { columns: ["attribute_id"], foreignTable: "product_attribute", onDelete: "restrict" },
      { columns: ["variant_id"], foreignTable: "product_variant", onDelete: "cascade" },
    ])
  })

  it("allows one value per attribute within a scope, counting a product-level value as its own scope", () => {
    const dialect = new SQLiteSyncDialect()
    const unique = config.indexes.filter((entry) => entry.config.unique)

    expect(
      unique.map((entry) => ({
        columns: entry.config.columns.map((column) => (column instanceof SQLiteColumn ? column.name : dialect.sqlToQuery(column).sql)),
        name: entry.config.name,
      })),
    ).toStrictEqual([
      {
        columns: ["product_id", "attribute_id", `coalesce("attribute_on_product"."variant_id", '')`],
        name: "attribute_on_product_scope_attribute_uidx",
      },
    ])
  })

  it("indexes the lookups the scope index does not lead with", () => {
    const plain = config.indexes.filter((entry) => !entry.config.unique)

    expect(plain.map((entry) => entry.config.name)).toStrictEqual([
      "attribute_on_product_attributeId_idx",
      "attribute_on_product_variantId_idx",
    ])
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
