import { formatCalendarDateToIsoDate, formatCalendarTime, toCalendarDateTime } from "~/src/modules/_core/utils/datetime"
import { wallClockStartMs } from "~/src/modules/_core/utils/datetime-column-filter"
import { isIsoDateTimeLocalString } from "~/src/modules/_core/utils/iso-datetime"
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

export const toIsoOrUndefined = (localValue: string, timeZone: string): string | undefined =>
  isIsoDateTimeLocalString(localValue) ? new Date(wallClockStartMs(localValue, timeZone)).toISOString() : undefined

export const toLocalInputValue = (isoValue: string | undefined, timeZone: string): string => {
  if (isoValue === undefined || isoValue === "") {
    return ""
  }

  const wallClock = toCalendarDateTime(isoValue, timeZone)

  return `${formatCalendarDateToIsoDate(wallClock)}T${formatCalendarTime(wallClock)}`
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
