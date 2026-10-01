import { isValidPhoneNumber } from "libphonenumber-js/mobile"
import type zod from "zod/v4"

import { type CheckoutValues } from "~/src/modules/checkout/checkout.zod"

const DEFAULT_COUNTRY = "PL"

const LOCKER_DELIVERY_TYPE = "locker"

const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  PL: /^\d{2}-\d{3}$/u,
}

const REQUIRED_BILLING_FIELDS = [
  ["billingAddress1", "validation.addressRequired"],
  ["billingFirstName", "validation.firstNameRequired"],
  ["billingLastName", "validation.lastNameRequired"],
  ["billingCity", "validation.cityRequired"],
  ["billingCountryCode", "validation.countryRequired"],
  ["billingPostalCode", "validation.postCodeRequired"],
] as const

const isValidPostalCode = (countryCode: string, postalCode: string): boolean => {
  const pattern = POSTAL_CODE_PATTERNS[countryCode]

  return pattern === undefined ? true : pattern.test(postalCode.trim())
}

const isFilled = (value: string | undefined): value is string => value !== undefined && value.trim().length > 0

const addCheckoutIssue = (ctx: zod.RefinementCtx, path: string, message: string): void => {
  ctx.addIssue({ code: "custom", message, path: [path] })
}

const refineBillingAddress = (data: CheckoutValues, ctx: zod.RefinementCtx): void => {
  for (const [field, message] of REQUIRED_BILLING_FIELDS) {
    if (!isFilled(data[field])) {
      addCheckoutIssue(ctx, field, message)
    }
  }

  if (isFilled(data.billingPostalCode) && !isValidPostalCode(data.billingCountryCode ?? DEFAULT_COUNTRY, data.billingPostalCode)) {
    addCheckoutIssue(ctx, "billingPostalCode", "validation.postCodeInvalid")
  }
}

export const isValidCheckoutPhone = (value: string): boolean => isValidPhoneNumber(value, DEFAULT_COUNTRY)

export const refineCheckout = (data: CheckoutValues, ctx: zod.RefinementCtx): void => {
  if (data.postalCode.length > 0 && !isValidPostalCode(data.countryCode, data.postalCode)) {
    addCheckoutIssue(ctx, "postalCode", "validation.postCodeInvalid")
  }

  if (!data.sameAsShipping) {
    refineBillingAddress(data, ctx)
  }

  if (data.deliveryMethodType === LOCKER_DELIVERY_TYPE && !isFilled(data.lockerId)) {
    addCheckoutIssue(ctx, "lockerId", "validation.lockerIdRequired")
  }
}
