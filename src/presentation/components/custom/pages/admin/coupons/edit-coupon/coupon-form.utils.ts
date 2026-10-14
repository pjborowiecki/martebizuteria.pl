import { DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

export const toCouponFormValues = (coupon: Discount["adminListItem"] | undefined): Discount["adminFormValues"] => {
  if (coupon === undefined) {
    return NEW_COUPON_FORM_VALUES
  }

  return {
    code: coupon.code,
    description: coupon.description,
    endsAt: coupon.endsAt?.toISOString(),
    isActive: coupon.isActive,
    maxDiscountAmount: coupon.maxDiscountAmountMinorUnits,
    minOrderTotal: coupon.minOrderTotalMinorUnits,
    perCustomerLimit: coupon.perCustomerLimit,
    startsAt: coupon.startsAt?.toISOString(),
    type: coupon.type,
    usageLimit: coupon.usageLimit,
    value: coupon.value,
  }
}

export const toIsoOrUndefined = (localValue: string): string | undefined => {
  if (localValue.trim() === "") {
    return undefined
  }

  const parsed = new Date(localValue)

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export const toLocalInputValue = (isoValue: string | undefined): string => {
  if (isoValue === undefined || isoValue === "") {
    return ""
  }

  const value = new Date(isoValue)
  const offsetMs = value.getTimezoneOffset() * MS_PER_MINUTE

  return new Date(value.getTime() - offsetMs).toISOString().slice(0, LOCAL_INPUT_LENGTH)
}

export const COUPON_FORM_VALIDATION_KEYS: ReadonlySet<string> = new Set([
  "validation.amountRequired",
  "validation.codeCharacters",
  "validation.codeTooLong",
  "validation.codeTooShort",
  "validation.endBeforeStart",
  "validation.percentageRange",
  "validation.positiveNumber",
])

const NEW_COUPON_FORM_VALUES: Discount["adminFormValues"] = {
  code: "",
  isActive: true,
  type: DISCOUNT_TYPE.PERCENTAGE,
  value: 0,
}

const MS_PER_MINUTE = 60_000

const LOCAL_INPUT_LENGTH = 16
