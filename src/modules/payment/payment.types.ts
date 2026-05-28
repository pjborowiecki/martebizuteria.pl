import type { payment } from "~/src/modules/payment/payment.schema";

export interface Payment {
  insert: typeof payment.$inferInsert;
  select: typeof payment.$inferSelect;
}
