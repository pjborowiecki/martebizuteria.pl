import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { account } from "~/src/modules/account/account.schema"

const config = getTableConfig(account)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("account table", () => {
  it("maps to the table name better-auth reads", () => {
    expect(config.name).toBe("account")
  })

  it("declares every credential and token column", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "access_token",
      "access_token_expires_at",
      "account_id",
      "created_at",
      "id",
      "id_token",
      "password",
      "provider_id",
      "refresh_token",
      "refresh_token_expires_at",
      "scope",
      "updated_at",
      "user_id",
    ])
  })

  it("keys a row by its own id", () => {
    expect(config.columns.filter((column) => column.primary).map((column) => column.name)).toStrictEqual(["id"])
    expect(config.primaryKeys).toStrictEqual([])
  })

  it.each(["account_id", "provider_id", "user_id", "created_at", "updated_at"])("requires %s", (name) => {
    expect(columnByName.get(name)?.notNull).toBe(true)
  })

  it.each(["access_token", "id_token", "refresh_token", "password", "scope", "access_token_expires_at", "refresh_token_expires_at"])(
    "leaves %s nullable because not every provider supplies it",
    (name) => {
      expect(columnByName.get(name)?.notNull).toBe(false)
    },
  )

  it("stores timestamps as integers so they round-trip through D1", () => {
    expect(columnByName.get("created_at")?.getSQLType()).toBe("integer")
    expect(columnByName.get("access_token_expires_at")?.getSQLType()).toBe("integer")
  })

  it("stamps both timestamps by default", () => {
    expect(columnByName.get("created_at")?.hasDefault).toBe(true)
    expect(columnByName.get("updated_at")?.hasDefault).toBe(true)
  })

  it("does not default the optional token expiry columns", () => {
    expect(columnByName.get("access_token_expires_at")?.hasDefault).toBe(false)
    expect(columnByName.get("refresh_token_expires_at")?.hasDefault).toBe(false)
  })

  it("removes a user's accounts with the user", () => {
    const references = config.foreignKeys.map((key) => {
      const reference = key.reference()

      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: key.onDelete,
      }
    })

    expect(references).toStrictEqual([{ columns: ["user_id"], foreignColumns: ["id"], foreignTable: "user", onDelete: "cascade" }])
  })

  it("indexes the lookup by user without claiming uniqueness", () => {
    const indexes = config.indexes.map((entry) => ({
      columns: entry.config.columns.map((column) => ("name" in column ? column.name : column)),
      name: entry.config.name,
      unique: entry.config.unique,
    }))

    expect(indexes).toStrictEqual([{ columns: ["user_id"], name: "account_userId_idx", unique: false }])
  })

  it("keeps no column unique so one user can hold several provider accounts", () => {
    expect(config.uniqueConstraints).toStrictEqual([])
    expect(config.columns.filter((column) => column.isUnique)).toStrictEqual([])
  })
})
