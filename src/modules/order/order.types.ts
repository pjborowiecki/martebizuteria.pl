import type { order } from "~/src/modules/order/order.schema";

/** Admin orders table row (matches legacy `OrderRecord` UI shape). */
export interface AdminOrderListItem {
  readonly customer: string;
  readonly customerId: string;
  readonly date: string;
  readonly email: string;
  readonly fulfillment: string;
  readonly id: string;
  readonly initials: string;
  readonly items: number;
  readonly payment: string;
  readonly total: string;
}

export interface Order {
  adminListItem: AdminOrderListItem;
  insert: typeof order.$inferInsert;
  select: typeof order.$inferSelect;
}
