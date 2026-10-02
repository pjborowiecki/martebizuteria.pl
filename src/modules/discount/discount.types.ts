import { type DiscountRejection, type DiscountStatus, type DiscountType } from "~/src/modules/discount/discount.constants"
import { type discount, type discountRedemption } from "~/src/modules/discount/discount.schema"

interface AppliedDiscount {
  readonly amountMinorUnits: number
  readonly code: string
  readonly discountId: string
  readonly type: DiscountType
}

interface DiscountValidationResult {
  readonly applied?: AppliedDiscount | undefined
  readonly rejection?: DiscountRejection | undefined
}

interface AdminDiscountListItem {
  readonly code: string
  readonly description: string | undefined
  readonly endsAt: Date | undefined
  readonly id: string
  readonly isActive: boolean
  readonly maxDiscountAmountMinorUnits: number | undefined
  readonly minOrderTotalMinorUnits: number | undefined
  readonly perCustomerLimit: number | undefined
  readonly startsAt: Date | undefined
  readonly status: DiscountStatus
  readonly type: DiscountType
  readonly usageCount: number
  readonly usageLimit: number | undefined
  readonly value: number
}

interface AdminDiscountStats {
  readonly active: number
  readonly currencyCode: string
  readonly redeemedTotalMinorUnits: number
  readonly redemptions: number
  readonly total: number
}

interface CheckoutDiscountCodeFormValues {
  readonly code: string
}

interface AdminDiscountFormValues {
  readonly code: string
  readonly description?: string | undefined
  readonly endsAt?: string | undefined
  readonly isActive: boolean
  readonly maxDiscountAmount?: number | undefined
  readonly minOrderTotal?: number | undefined
  readonly perCustomerLimit?: number | undefined
  readonly startsAt?: string | undefined
  readonly type: DiscountType
  readonly usageLimit?: number | undefined
  readonly value: number
}

export interface Discount {
  adminFormValues: AdminDiscountFormValues
  adminListItem: AdminDiscountListItem
  adminStats: AdminDiscountStats
  applied: AppliedDiscount
  checkoutCodeFormValues: CheckoutDiscountCodeFormValues
  insert: typeof discount.$inferInsert
  redemptionInsert: typeof discountRedemption.$inferInsert
  select: typeof discount.$inferSelect
  validation: DiscountValidationResult
}
