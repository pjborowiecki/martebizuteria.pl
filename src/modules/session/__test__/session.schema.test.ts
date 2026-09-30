import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { expect, it } from "vite-plus/test"

import { session } from "~/src/modules/session/session.schema"

it("ties sessions to their owner and deletes them when the owner is deleted", () => {
  const config = getTableConfig(session)
  const references = config.foreignKeys.map((key) => ({
    columns: key.reference().columns.map((column) => column.name),
    foreignColumns: key.reference().foreignColumns.map((column) => column.name),
    onDelete: key.onDelete,
    table: getTableName(key.reference().foreignTable),
  }))
  expect(references).toStrictEqual([{ columns: ["user_id"], foreignColumns: ["id"], onDelete: "cascade", table: "user" }])
  expect(config.indexes.map((entry) => entry.config.name)).toContain("session_userId_idx")
})
