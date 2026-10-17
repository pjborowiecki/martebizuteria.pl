import { type z } from "zod/v4"

import { type InpostLockerPoint } from "~/src/integrations/inpost/inpost.zod"

import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import {
  type AdminOrderAdvancedStep,
  type AdminOrderDetailTag,
  type AdminOrderEmailStatus,
  type AdminOrderFulfillmentStepKey,
  type AdminOrderFulfillmentUiKey,
  type AdminOrderPaymentUiKey,
  type AdminOrderStatFilter,
  type AdminOrderTab,
  type AdminOrderTimelineKind,
  type OrderEmailKind,
  type OrderEmailNoticeStatus,
} from "~/src/modules/order/order.constants"
import { type order } from "~/src/modules/order/order.schema"
import { type orderZodSchemas } from "~/src/modules/order/order.zod"
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
  readonly billingCompanyName?: string | undefined
  readonly billingNip?: string | undefined
  readonly createdAt: Date
  readonly currencyCode: string
  readonly customerName: string
  readonly destination?: string | undefined
  readonly email: string
  readonly emailedSteps: readonly AdminOrderAdvancedStep[]
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly fulfillmentUiKey: AdminOrderFulfillmentUiKey
  readonly hasOpenDispute: boolean
  readonly id: string
  readonly initials: string
  readonly itemCount: number
  readonly orderNumber: string
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
  readonly accountEmail: string | undefined
  readonly email: string
  readonly initials: string
  readonly name: string
  readonly orderCount: number
  readonly phone: string | undefined
  readonly recipientEmail: string | undefined
  readonly totalSpentMinorUnits: number
  readonly userId: string | undefined
}

interface AdminOrderDetailDelivery {
  readonly courierCode: string | undefined
  readonly courierName: string | undefined
  readonly lockerId: string | undefined
  readonly lockerPoint: InpostLockerPoint | undefined
  readonly lockerUnconfirmed: boolean
  readonly methodName: string
  readonly type: DeliveryMethodType
}

interface AdminOrderDetailInpostShipment {
  readonly id: string
  readonly status: string | undefined
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
  readonly detail: AuditLog["detail"] | undefined
  readonly emailStatus: AdminOrderEmailStatus | undefined
  readonly id: string
  readonly kind: AdminOrderTimelineKind
  readonly labelKey: string
  readonly resendable: boolean
  readonly severity: AuditLogSeverity
}

interface AdminOrderDetail {
  readonly billingAddress: AdminOrderDetailAddress | undefined
  readonly billingCompanyName: string | undefined
  readonly billingNip: string | undefined
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
  readonly emailedSteps: readonly AdminOrderAdvancedStep[]
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly fulfillmentSteps: readonly AdminOrderDetailFulfillmentStep[]
  readonly fulfillmentUiKey: AdminOrderFulfillmentUiKey
  readonly id: string
  readonly inpostConfigured: boolean
  readonly inpostShipment: AdminOrderDetailInpostShipment | undefined
  readonly items: readonly AdminOrderDetailItem[]
  readonly payment: AdminOrderDetailPayment | undefined
  readonly paymentUiKey: AdminOrderPaymentUiKey
  readonly restockedAt: Date | undefined
  readonly shippedAt: Date | undefined
  readonly shippingAddress: AdminOrderDetailAddress | undefined
  readonly shippingTotalMinorUnits: number
  readonly status: Order["select"]["status"]
  readonly subtotalMinorUnits: number
  readonly tags: readonly AdminOrderDetailTag[]
  readonly taxBasisPoints: number
  readonly taxTotalMinorUnits: number
  readonly timeline: readonly AdminOrderDetailTimelineEvent[]
  readonly totalMinorUnits: number
  readonly trackingNumber: string | undefined
  readonly trackingUrl: string | undefined
  readonly withdrawals: readonly OrderWithdrawal["recorded"][]
}

interface OrderLocker {
  readonly code: string
  readonly point: InpostLockerPoint | undefined
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
  readonly locker: OrderLocker | undefined
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
  readonly userId?: string | undefined
}

interface OrderRefundInput {
  fullyRefunded: boolean
  refundedAmount: number
  transactionId: string
}

interface SettledOrder {
  checkoutId: string
  orderId: string | undefined
  paymentId: string
  paymentStatus: string
}

interface OrderEmailNotice {
  readonly kind: OrderEmailKind
  readonly status: OrderEmailNoticeStatus
}

interface AdminOrderStepBack {
  readonly from: AdminOrderAdvancedStep
  readonly to: AdminOrderFulfillmentStepKey
}

interface UnannouncedOrderRefund {
  readonly amount: number
  readonly fullyRefunded: boolean
  readonly orderId: string
  readonly refundedTotal: number
}

interface OrderRefundEmail extends UnannouncedOrderRefund {
  readonly refundId: string | undefined
}

interface FailedOrderRefundInput {
  readonly refund: {
    readonly amount: number
    readonly failureReason: string | undefined
    readonly id: string
    readonly status: string
  }
  readonly refundedAmount: number
  readonly transactionId: string
}

interface FailedOrderRefund {
  readonly orderId: string
  readonly orderNumber: string
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
  email: z.infer<(typeof orderZodSchemas)["email"]>
  emailNotice: OrderEmailNotice
  failedRefund: FailedOrderRefund
  failedRefundInput: FailedOrderRefundInput
  locker: OrderLocker
  insert: typeof order.$inferInsert
  refundEmail: OrderRefundEmail
  refundInput: OrderRefundInput
  select: typeof order.$inferSelect
  settled: SettledOrder
  stepBack: AdminOrderStepBack
  unannouncedRefund: UnannouncedOrderRefund
}
