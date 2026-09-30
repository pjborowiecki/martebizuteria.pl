import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import {
  type AdminOrderFulfillmentUiKey,
  type AdminOrderPaymentUiKey,
  type AdminOrderStatFilter,
  type AdminOrderTab,
} from "~/src/modules/order/order.constants"
import { type order } from "~/src/modules/order/order.schema"

interface AdminOrderAuditSnapshot {
  readonly orderStatus?: string | undefined
  readonly paymentStatus: string
  readonly refundedAmount?: number | undefined
}

interface AdminOrderDisputeMetadata {
  amount: number
  id: string
  reason: string
  status: string
}

interface AdminOrdersListFilters {
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly fulfillment?: AdminOrderFulfillmentUiKey | undefined
  readonly payment?: AdminOrderPaymentUiKey | undefined
  readonly status?: Order["select"]["status"] | undefined
  readonly total?: NumericColumnFilterValue | undefined
}

interface AdminOrderListItem {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly customerName: string
  readonly email: string
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly fulfillmentUiKey: AdminOrderFulfillmentUiKey
  readonly id: string
  readonly initials: string
  readonly itemCount: number
  readonly paymentUiKey: AdminOrderPaymentUiKey
  readonly status: Order["select"]["status"]
  readonly totalMinorUnits: number
  readonly userId: string | null
}

interface AdminOrderStats {
  readonly avgValueMinorUnits: number
  readonly currencyCode: string
  readonly pending: number
  readonly revenueMinorUnits: number
  readonly totalOrders: number
}

type AdminOrdersPageInput = AdminOrdersListFilters & {
  readonly page?: number | undefined
  readonly pageSize?: number | undefined
  readonly search?: string | undefined
  readonly statFilter?: AdminOrderStatFilter | undefined
  readonly tab?: AdminOrderTab | undefined
}

interface OrderRefundInput {
  fullyRefunded: boolean
  refundedAmount: number
  restock: boolean
  transactionId: string
}

interface SettledOrder {
  checkoutId: string
  orderId: string | undefined
  paymentId: string
  paymentStatus: string
}

export interface Order {
  adminExportInput: Omit<AdminOrdersPageInput, "page" | "pageSize">
  adminListFilters: AdminOrdersListFilters
  adminListItem: AdminOrderListItem
  adminPageInput: AdminOrdersPageInput
  adminStats: AdminOrderStats
  auditSnapshot: AdminOrderAuditSnapshot
  disputeMetadata: AdminOrderDisputeMetadata
  insert: typeof order.$inferInsert
  refundInput: OrderRefundInput
  select: typeof order.$inferSelect
  settled: SettledOrder
}
