import { type Address } from "~/src/modules/address/address.types"
import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"
import { type Order } from "~/src/modules/order/order.types"

export interface CustomerAccountOrderItem {
  readonly image?: string | undefined
  readonly name: string
  readonly priceMinorUnits: number
  readonly qty: number
  readonly variantTitle?: string | undefined
}

export interface CustomerAccountOrderSummary {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly filterStatus: CustomerAccountOrderFilter
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly id: string
  readonly items: readonly CustomerAccountOrderItem[]
  readonly status: Order["select"]["status"]
  readonly totalMinorUnits: number
}

export interface CustomerAccountOrderAddress {
  readonly city: string
  readonly countryCode: string
  readonly line1: string
  readonly line2?: string | undefined
  readonly name: string
  readonly phone?: string | undefined
  readonly postalCode?: string | undefined
  readonly province?: string | undefined
}

export interface CustomerAccountOrderTimelineEntry {
  readonly date: Date
  readonly event: "cancelled" | "confirmed" | "delivered" | "placed" | "shipped"
}

export interface CustomerAccountOrderDetail extends CustomerAccountOrderSummary {
  readonly billingAddress?: CustomerAccountOrderAddress | undefined
  readonly deliveredAt?: Date | undefined
  readonly paymentProvider?: string | undefined
  readonly shippedAt?: Date | undefined
  readonly shippingAddress?: CustomerAccountOrderAddress | undefined
  readonly shippingMinorUnits: number
  readonly subtotalMinorUnits: number
  readonly taxMinorUnits: number
  readonly timeline: readonly CustomerAccountOrderTimelineEntry[]
  readonly trackingNumber?: string | undefined
  readonly trackingUrl?: string | undefined
}

export interface CustomerAccountOverviewStats {
  readonly memberSinceYear: string
  readonly totalOrders: number
  readonly totalSpentMinorUnits: number
  readonly wishlistCount: number
}

export interface CustomerAccountActivityItem {
  readonly actionKey: string
  readonly createdAt: Date
  readonly params: Record<string, string>
}

export interface CustomerAccountRecommendation {
  readonly handle: string
  readonly image?: string | undefined
  readonly name: string
  readonly priceMinorUnits?: number | undefined
  readonly productId: string
}

export interface CustomerAccountOverview {
  readonly activity: readonly CustomerAccountActivityItem[]
  readonly recentOrders: readonly CustomerAccountOrderSummary[]
  readonly recommendations: readonly CustomerAccountRecommendation[]
  readonly stats: CustomerAccountOverviewStats
}

export interface CustomerAccountProfile {
  readonly createdAt: Date
  readonly email: string
  readonly name: string
  readonly phone?: string | undefined
  readonly timezone?: string | undefined
}

export interface CustomerAccountSession {
  readonly browser: string
  readonly createdAt: Date
  readonly device: string
  readonly deviceType: "desktop" | "mobile" | "tablet" | "unknown"
  readonly id: string
  readonly ipAddress?: string | undefined
  readonly isCurrent: boolean
  readonly lastActiveAt: Date
}

export interface CustomerAccountLoginHistoryItem {
  readonly createdAt: Date
  readonly detail?: string | undefined
  readonly status: "blocked" | "success"
}

export type CustomerAccountAddress = Address["select"]
