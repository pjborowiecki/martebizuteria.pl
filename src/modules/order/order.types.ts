import { type order } from "~/src/modules/order/order.schema"

export interface AdminOrderListItem {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly customerName: string
  readonly email: string
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly fulfillmentUiKey: string
  readonly id: string
  readonly initials: string
  readonly itemCount: number
  readonly paymentUiKey: string
  readonly status: Order["select"]["status"]
  readonly totalMinorUnits: number
  readonly userId: string | null
}

export interface AdminOrderStats {
  readonly avgValueMinorUnits: number
  readonly currencyCode: string
  readonly pending: number
  readonly revenueMinorUnits: number
  readonly totalOrders: number
}

export interface Order {
  adminListItem: AdminOrderListItem
  insert: typeof order.$inferInsert
  select: typeof order.$inferSelect
}
