import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import {
  type AdminOrderDetailTag,
  type AdminOrderEmailStatus,
  type AdminOrderFulfillmentStepKey,
  type AdminOrderFulfillmentUiKey,
  type AdminOrderPaymentUiKey,
  type AdminOrderStatFilter,
  type AdminOrderTab,
  type AdminOrderTimelineKind,
} from "~/src/modules/order/order.constants"
import { type order } from "~/src/modules/order/order.schema"
import { type payment } from "~/src/modules/payment/payment.schema"

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

interface AdminOrderDetailAddress {
  readonly city: string
  readonly countryCode: string
  readonly line1: string
  readonly line2: string | undefined
  readonly name: string
  readonly phone: string | undefined
  readonly postalCode: string | undefined
  readonly province: string | undefined
}

interface AdminOrderDetailCustomer {
  readonly email: string
  readonly initials: string
  readonly name: string
  readonly orderCount: number
  readonly phone: string | undefined
  readonly totalSpentMinorUnits: number
  readonly userId: string | undefined
}

interface AdminOrderDetailDelivery {
  readonly courierName: string | undefined
  readonly lockerId: string | undefined
  readonly methodName: string
  readonly type: DeliveryMethodType
}

interface AdminOrderDetailItem {
  readonly id: string
  readonly imageUrl: string | undefined
  readonly productHandle: string | undefined
  readonly quantity: number
  readonly sku: string | undefined
  readonly title: string
  readonly totalMinorUnits: number
  readonly unitPriceMinorUnits: number
  readonly variantTitle: string | undefined
}

interface AdminOrderDetailPayment {
  readonly amountMinorUnits: number
  readonly provider: string
  readonly refundedAmountMinorUnits: number
  readonly refundedAt: Date | undefined
  readonly status: (typeof payment.$inferSelect)["status"]
  readonly transactionId: string | undefined
}

interface AdminOrderDetailFulfillmentStep {
  readonly at: Date | undefined
  readonly done: boolean
  readonly key: AdminOrderFulfillmentStepKey
}

interface AdminOrderDetailTimelineEvent {
  readonly actorName: string
  readonly at: Date
  readonly detail: string | undefined
  readonly emailStatus: AdminOrderEmailStatus | undefined
  readonly id: string
  readonly kind: AdminOrderTimelineKind
  readonly labelKey: string
  readonly severity: AuditLogSeverity
}

interface AdminOrderDetail {
  readonly billingAddress: AdminOrderDetailAddress | undefined
  readonly billingSameAsShipping: boolean
  readonly canceledAt: Date | undefined
  readonly createdAt: Date
  readonly currencyCode: string
  readonly customer: AdminOrderDetailCustomer
  readonly customerNote: string | undefined
  readonly deliveredAt: Date | undefined
  readonly delivery: AdminOrderDetailDelivery | undefined
  readonly discountTotalMinorUnits: number
  readonly displayId: string
  readonly dispute: AdminOrderDisputeMetadata | undefined
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly fulfillmentSteps: readonly AdminOrderDetailFulfillmentStep[]
  readonly fulfillmentUiKey: AdminOrderFulfillmentUiKey
  readonly id: string
  readonly items: readonly AdminOrderDetailItem[]
  readonly payment: AdminOrderDetailPayment | undefined
  readonly paymentUiKey: AdminOrderPaymentUiKey
  readonly shippedAt: Date | undefined
  readonly shippingAddress: AdminOrderDetailAddress | undefined
  readonly shippingTotalMinorUnits: number
  readonly status: Order["select"]["status"]
  readonly subtotalMinorUnits: number
  readonly tags: readonly AdminOrderDetailTag[]
  readonly taxTotalMinorUnits: number
  readonly timeline: readonly AdminOrderDetailTimelineEvent[]
  readonly totalMinorUnits: number
  readonly trackingNumber: string | undefined
  readonly trackingUrl: string | undefined
}

interface OrderConfirmation {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly deliveryMethodName: string | undefined
  readonly discountTotalMinorUnits: number
  readonly email: string
  readonly id: string
  readonly isGuestOrder: boolean
  readonly isOwnOrder: boolean
  readonly items: readonly AdminOrderDetailItem[]
  readonly orderNumber: string
  readonly shippingAddress: AdminOrderDetailAddress | undefined
  readonly shippingTotalMinorUnits: number
  readonly subtotalMinorUnits: number
  readonly taxBasisPoints: number
  readonly taxTotalMinorUnits: number
  readonly totalMinorUnits: number
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
  adminOrderDetail: AdminOrderDetail
  adminOrderDetailAddress: AdminOrderDetailAddress
  adminOrderDetailItem: AdminOrderDetailItem
  adminOrderDetailTimelineEvent: AdminOrderDetailTimelineEvent
  confirmation: OrderConfirmation
  adminPageInput: AdminOrdersPageInput
  adminStats: AdminOrderStats
  auditSnapshot: AdminOrderAuditSnapshot
  disputeMetadata: AdminOrderDisputeMetadata
  insert: typeof order.$inferInsert
  refundInput: OrderRefundInput
  select: typeof order.$inferSelect
  settled: SettledOrder
}
