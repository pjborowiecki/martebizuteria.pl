import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { twoFactor, twoFactorRelations } from "~/src/modules/two-factor/two-factor.schema"

const config = getTableConfig(twoFactor)

const relationEntries = Object.entries(twoFactorRelations.config(createTableRelationsHelpers(twoFactor)))

describe("two factor relations", () => {
  it("relates a factor to the single user that owns it", () => {
    expect(relationEntries.map(([name]) => name)).toStrictEqual(["user"])
  })

  it("joins the owner on the user id the row stores", () => {
    const [entry] = relationEntries
    const relation = entry?.[1]

    expect(relation === undefined ? undefined : getTableName(relation.referencedTable)).toBe("user")
    expect(relation?.config?.fields.map((field) => field.name)).toStrictEqual(["user_id"])
    expect(relation?.config?.references.map((field) => field.name)).toStrictEqual(["id"])
  })

  it("deletes the factor with the user it protects", () => {
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

  it("refreshes updated_at on every write but leaves created_at alone", () => {
    const columnByName = new Map(config.columns.map((column) => [column.name, column]))

    expect(columnByName.get("created_at")?.onUpdateFn).toBeUndefined()
    expect(columnByName.get("updated_at")?.onUpdateFn?.()).toBeInstanceOf(Date)
    expect(columnByName.get("created_at")?.defaultFn?.()).toBeInstanceOf(Date)
  })
})
