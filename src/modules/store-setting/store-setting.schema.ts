import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

export const storeSetting = sqliteTable("store_setting", {
  freeDeliveryThreshold: integer("free_delivery_threshold"),
  id: text("id").primaryKey(),
  salesPaused: integer("sales_paused", { mode: "boolean" }).default(false).notNull(),
  sellerCity: text("seller_city").default("").notNull(),
  sellerCountryCode: text("seller_country_code").default("").notNull(),
  sellerEmail: text("seller_email").default("").notNull(),
  sellerLegalName: text("seller_legal_name").default("").notNull(),
  sellerNip: text("seller_nip").default("").notNull(),
  sellerPhone: text("seller_phone").default("").notNull(),
  sellerPostalCode: text("seller_postal_code").default("").notNull(),
  sellerRegon: text("seller_regon").default("").notNull(),
  sellerStreet: text("seller_street").default("").notNull(),
  sellerUpdatedAt: timestamp("seller_updated_at").default(new Date(0)).notNull(),
  ...timestamps(),
})
