import { type z } from "zod/v4"

import { type Address } from "~/src/modules/address/address.types"
import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"
import { type customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { type Order } from "~/src/modules/order/order.types"

interface CustomerAccountOrderItem {
  readonly handle?: string | undefined
  readonly id: string
  readonly image?: string | undefined
  readonly lineTotalMinorUnits: number
  readonly name: string
  readonly qty: number
  readonly unitPriceMinorUnits: number
  readonly variantTitle?: string | undefined
}

interface CustomerAccountOrderSummary {
  readonly createdAt: Date
  readonly itemCount: number
  readonly currencyCode: string
  readonly filterStatus: CustomerAccountOrderFilter
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly id: string
  readonly items: readonly CustomerAccountOrderItem[]
  readonly orderNumber: string
  readonly status: Order["select"]["status"]
  readonly totalMinorUnits: number
}

interface CustomerAccountOrdersPage {
  readonly orders: readonly CustomerAccountOrderSummary[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
}

interface CustomerAccountOrderAddress {
  readonly city: string
  readonly countryCode: string
  readonly line1: string
  readonly line2?: string | undefined
  readonly name: string
  readonly phone?: string | undefined
  readonly postalCode?: string | undefined
  readonly province?: string | undefined
}

interface CustomerAccountOrderTimelineEntry {
  readonly date: Date
  readonly event: "cancelled" | "confirmed" | "delivered" | "placed" | "refunded" | "shipped"
}

interface CustomerAccountOrderRefund {
  readonly amountMinorUnits: number
  readonly refundedAt?: Date | undefined
}

interface CustomerAccountOrderDetail extends CustomerAccountOrderSummary {
  readonly billingAddress?: CustomerAccountOrderAddress | undefined
  readonly billingCompanyName?: string | undefined
  readonly billingNip?: string | undefined
  readonly customerNote?: string | undefined
  readonly deliveredAt?: Date | undefined
  readonly deliveryMethodName?: string | undefined
  readonly discountMinorUnits: number
  readonly lockerId?: string | undefined
  readonly paymentProvider?: string | undefined
  readonly refund?: CustomerAccountOrderRefund | undefined
  readonly shippedAt?: Date | undefined
  readonly shippingAddress?: CustomerAccountOrderAddress | undefined
  readonly shippingMinorUnits: number
  readonly subtotalMinorUnits: number
  readonly taxBasisPoints: number
  readonly taxMinorUnits: number
  readonly timeline: readonly CustomerAccountOrderTimelineEntry[]
  readonly trackingNumber?: string | undefined
  readonly trackingUrl?: string | undefined
}

interface CustomerAccountOverviewStats {
  readonly memberSinceYear: string
  readonly totalOrders: number
  readonly totalSpentMinorUnits: number
  readonly wishlistCount: number
}

interface CustomerAccountActivityItem {
  readonly actionKey: string
  readonly createdAt: Date
  readonly params: Record<string, string>
}

interface CustomerAccountRecommendation {
  readonly handle: string
  readonly image?: string | undefined
  readonly name: string
  readonly priceMinorUnits?: number | undefined
  readonly productId: string
}

interface CustomerAccountOverview {
  readonly activity: readonly CustomerAccountActivityItem[]
  readonly recentOrders: readonly CustomerAccountOrderSummary[]
  readonly recommendations: readonly CustomerAccountRecommendation[]
  readonly stats: CustomerAccountOverviewStats
}

interface CustomerAccountProfile {
  readonly createdAt: Date
  readonly email: string
  readonly emailVerified: boolean
  readonly hasPassword: boolean
  readonly name: string
  readonly phone?: string | undefined
  readonly timezone?: string | undefined
}

interface CustomerAccountSession {
  readonly browser: string
  readonly createdAt: Date
  readonly device: string
  readonly deviceType: "desktop" | "mobile" | "tablet" | "unknown"
  readonly id: string
  readonly ipAddress?: string | undefined
  readonly isCurrent: boolean
  readonly lastActiveAt: Date
}

interface CustomerAccountLoginHistoryItem {
  readonly createdAt: Date
  readonly ipAddress?: string | undefined
  readonly status: "blocked" | "success"
}

export interface CustomerAccount {
  activityItem: CustomerAccountActivityItem
  address: Address["select"]
  loginHistoryItem: CustomerAccountLoginHistoryItem
  orderAddress: CustomerAccountOrderAddress
  orderDetail: CustomerAccountOrderDetail
  orderItem: CustomerAccountOrderItem
  orderRefund: CustomerAccountOrderRefund
  orderSummary: CustomerAccountOrderSummary
  ordersPage: CustomerAccountOrdersPage
  orderTimelineEntry: CustomerAccountOrderTimelineEntry
  overview: CustomerAccountOverview
  overviewStats: CustomerAccountOverviewStats
  profile: CustomerAccountProfile
  profileForm: z.infer<(typeof customerAccountZodSchemas)["profileForm"]>
  recommendation: CustomerAccountRecommendation
  session: CustomerAccountSession
}
