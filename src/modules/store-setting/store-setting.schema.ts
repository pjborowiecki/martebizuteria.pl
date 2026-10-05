import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

export const storeSetting = sqliteTable("store_setting", {
  id: text("id").primaryKey(),
  salesPaused: integer("sales_paused", { mode: "boolean" }).default(false).notNull(),
  ...timestamps(),
})
