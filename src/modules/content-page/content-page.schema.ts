import { sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { CONTENT_PAGE_COLUMN_LENGTH, CONTENT_PAGE_HANDLES } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

export const contentPage = sqliteTable("content_page", {
  bodies: text("bodies", { mode: "json" }).$type<ContentPage["localeMap"]>().notNull(),
  descriptions: text("descriptions", { mode: "json" }).$type<ContentPage["localeMap"]>().notNull(),
  handle: text("handle", { enum: CONTENT_PAGE_HANDLES, length: CONTENT_PAGE_COLUMN_LENGTH.handle }).notNull().unique(),
  id: text("id", { length: CONTENT_PAGE_COLUMN_LENGTH.id }).primaryKey(),
  revisedAts: text("revised_ats", { mode: "json" }).$type<ContentPage["revisionMap"]>().notNull(),
  titles: text("titles", { mode: "json" }).$type<ContentPage["localeMap"]>().notNull(),
  ...timestamps(),
})
