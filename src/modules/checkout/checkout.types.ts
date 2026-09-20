import { type checkout } from "~/src/modules/checkout/checkout.schema"

export interface Checkout {
  insert: typeof checkout.$inferInsert
  select: typeof checkout.$inferSelect
}
