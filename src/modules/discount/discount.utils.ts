import {
  DISCOUNT_PERCENTAGE_MAX,
  DISCOUNT_REJECTION,
  DISCOUNT_STATUS,
  DISCOUNT_TYPE,
  type DiscountRejection,
  type DiscountStatus,
} from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

const NO_AMOUNT = 0

export const normalizeDiscountCode = (code: string): string => code.trim().toUpperCase()

export const calculateDiscountAmount = ({ itemsSubtotal, row, shippingTotal }: CalculateDiscountAmountInput): number => {
  if (row.type === DISCOUNT_TYPE.FREE_SHIPPING) {
    return shippingTotal
  }

  if (row.type === DISCOUNT_TYPE.FIXED_AMOUNT) {
    return Math.min(row.value, itemsSubtotal)
  }

  const percentage = Math.min(Math.max(row.value, NO_AMOUNT), DISCOUNT_PERCENTAGE_MAX)
  const raw = Math.round((itemsSubtotal * percentage) / DISCOUNT_PERCENTAGE_MAX)
  const capped = row.maxDiscountAmount === null ? raw : Math.min(raw, row.maxDiscountAmount)

  return Math.min(capped, itemsSubtotal)
}

export const resolveDiscountRejection = ({ itemsSubtotal, now, row }: ResolveRejectionInput): DiscountRejection | undefined => {
  if (!row.isActive) {
    return DISCOUNT_REJECTION.INACTIVE
  }

  if (row.startsAt !== null && row.startsAt.getTime() > now.getTime()) {
    return DISCOUNT_REJECTION.NOT_STARTED
  }

  if (row.endsAt !== null && row.endsAt.getTime() <= now.getTime()) {
    return DISCOUNT_REJECTION.EXPIRED
  }

  if (row.usageLimit !== null && row.usageCount >= row.usageLimit) {
    return DISCOUNT_REJECTION.EXHAUSTED
  }

  if (row.perCustomerLimit !== null && row.redeemedByCustomer >= row.perCustomerLimit) {
    return DISCOUNT_REJECTION.ALREADY_USED
  }

  if (row.minOrderTotal !== null && itemsSubtotal < row.minOrderTotal) {
    return DISCOUNT_REJECTION.MIN_ORDER_NOT_MET
  }

  return undefined
}

export const resolveAppliedCheckoutDiscount = ({
  itemsSubtotal,
  now,
  row,
  shippingTotal,
}: ResolveAppliedCheckoutDiscountInput): Discount["applied"] | undefined => {
  if (row === undefined) {
    return undefined
  }

  const rejection = resolveDiscountRejection({ itemsSubtotal, now, row })
  if (rejection !== undefined) {
    console.info(`Discount ${row.code} not applied to checkout: ${rejection}.`)

    return undefined
  }

  const amountMinorUnits = calculateDiscountAmount({ itemsSubtotal, row, shippingTotal })
  if (amountMinorUnits <= NO_AMOUNT) {
    return undefined
  }

  return {
    amountMinorUnits,
    code: row.code,
    discountId: row.id,
    type: row.type,
  }
}

export const resolveDiscountStatus = (row: DiscountStatusRow, now: Date = new Date()): DiscountStatus => {
  if (!row.isActive) {
    return DISCOUNT_STATUS.DISABLED
  }

  if (row.endsAt !== null && row.endsAt.getTime() <= now.getTime()) {
    return DISCOUNT_STATUS.EXPIRED
  }

  if (row.usageLimit !== null && row.usageCount >= row.usageLimit) {
    return DISCOUNT_STATUS.EXHAUSTED
  }

  if (row.startsAt !== null && row.startsAt.getTime() > now.getTime()) {
    return DISCOUNT_STATUS.SCHEDULED
  }

  return DISCOUNT_STATUS.ACTIVE
}

interface CalculateDiscountAmountInput {
  readonly itemsSubtotal: number
  readonly row: Pick<Discount["select"], "maxDiscountAmount" | "type" | "value">
  readonly shippingTotal: number
}

interface ResolveRejectionInput {
  readonly itemsSubtotal: number
  readonly now: Date
  readonly row: Pick<
    Discount["selectForCustomer"],
    "endsAt" | "isActive" | "minOrderTotal" | "perCustomerLimit" | "redeemedByCustomer" | "startsAt" | "usageCount" | "usageLimit"
  >
}

interface ResolveAppliedCheckoutDiscountInput {
  readonly itemsSubtotal: number
  readonly now: Date
  readonly row: Discount["selectForCustomer"] | undefined
  readonly shippingTotal: number
}

type DiscountStatusRow = Pick<Discount["select"], "endsAt" | "isActive" | "startsAt" | "usageCount" | "usageLimit">
