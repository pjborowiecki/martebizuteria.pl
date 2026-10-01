import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export const storefrontSearch = sqliteTable("storefront_search", {
  description: text("description"),
  entityId: text("entity_id").notNull(),
  handle: text("handle"),
  kind: text("kind", { enum: ["category", "collection", "product"] }).notNull(),
  subtitle: text("subtitle"),
  tags: text("tags"),
  title: text("title"),
})
