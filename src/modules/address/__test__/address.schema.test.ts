import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { address } from "~/src/modules/address/address.schema"

const config = getTableConfig(address)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("address table", () => {
  it("maps to the address table name", () => {
    expect(config.name).toBe("address")
  })

  it("declares the postal fields, the owner link and the default flag", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "address1",
      "address2",
      "city",
      "country_code",
      "created_at",
      "first_name",
      "id",
      "is_default",
      "last_name",
      "phone",
      "postal_code",
      "province",
      "updated_at",
      "user_id",
    ])
  })

  it("keys a row by an id the caller supplies", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.hasDefault).toBe(false)
  })

  it("requires the street line, the city and the country", () => {
    expect(columnByName.get("address1")?.notNull).toBe(true)
    expect(columnByName.get("city")?.notNull).toBe(true)
    expect(columnByName.get("country_code")?.notNull).toBe(true)
  })

  it("leaves the second line, the name, the phone, the postal code and the province optional", () => {
    for (const name of ["address2", "first_name", "last_name", "phone", "postal_code", "province"]) {
      expect(columnByName.get(name)?.notNull).toBe(false)
    }
  })

  it("stores the default flag as a boolean that starts false", () => {
    const isDefault = columnByName.get("is_default")

    expect(isDefault?.notNull).toBe(true)
    expect(isDefault?.default).toBe(false)
    expect(isDefault?.getSQLType()).toBe("integer")
  })

  it("keeps a guest address that belongs to no account", () => {
    expect(columnByName.get("user_id")?.notNull).toBe(false)
  })

  it("drops the address when its owner is deleted", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["user_id"], foreignTable: "user", onDelete: "cascade" }])
  })

  it("indexes both the owner lookup and the default address lookup", () => {
    const indexes = config.indexes.map((entry) => ({
      columns: entry.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: entry.config.name,
      unique: entry.config.unique,
    }))

    expect(indexes).toStrictEqual([
      { columns: ["user_id"], name: "address_userId_idx", unique: false },
      { columns: ["user_id", "is_default"], name: "address_userId_isDefault_idx", unique: false },
    ])
  })
})
