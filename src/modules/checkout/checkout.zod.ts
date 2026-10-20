import { isValidPhoneNumber, parsePhoneNumberWithError } from "libphonenumber-js/mobile"
import zod from "zod/v4"

import { isValidNip, normalizeNip } from "~/src/modules/_core/utils/polish-business-ids"
import { ADDRESS_COLUMN_LENGTH } from "~/src/modules/address/address.constants"
import { COMPANY_NAME_MAX_LENGTH } from "~/src/modules/checkout/checkout.constants"
import { DELIVERY_COUNTRY_CODES } from "~/src/modules/delivery-method/delivery-method.constants"
import { DISCOUNT_CODE_MAX_LENGTH } from "~/src/modules/discount/discount.constants"

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

const refineCompanyInvoice = (data: CheckoutValues, ctx: zod.RefinementCtx): void => {
  if (!isFilled(data.billingCompanyName)) {
    addCheckoutIssue(ctx, "billingCompanyName", "validation.companyNameRequired")
  }

  if (!isFilled(data.billingNip)) {
    addCheckoutIssue(ctx, "billingNip", "validation.nipRequired")
  } else if (!isValidNip(data.billingNip)) {
    addCheckoutIssue(ctx, "billingNip", "validation.nipInvalid")
  }
}

export const isValidCheckoutPhone = (value: string): boolean => isValidPhoneNumber(value, DEFAULT_COUNTRY)

export const toInternationalCheckoutPhone = (value: string): string => parsePhoneNumberWithError(value, DEFAULT_COUNTRY).number

export const refineCheckout = (data: CheckoutValues, ctx: zod.RefinementCtx): void => {
  if (data.countryCode.length > 0 && !DELIVERY_COUNTRY_CODES.has(data.countryCode)) {
    addCheckoutIssue(ctx, "countryCode", "validation.countryNotDelivered")
  }

  if (data.postalCode.length > 0 && !isValidPostalCode(data.countryCode, data.postalCode)) {
    addCheckoutIssue(ctx, "postalCode", "validation.postCodeInvalid")
  }

  if (!data.sameAsShipping) {
    refineBillingAddress(data, ctx)
  }

  if (data.companyInvoice) {
    refineCompanyInvoice(data, ctx)
  }

  if (data.deliveryMethodType === LOCKER_DELIVERY_TYPE && !isFilled(data.lockerId)) {
    addCheckoutIssue(ctx, "lockerId", "validation.lockerIdRequired")
  }
}

const baseAddressSchema = zod.object({
  address1: zod.string().min(1, "validation.addressRequired"),
  address2: zod.string().max(ADDRESS_COLUMN_LENGTH.address2).nullable().optional(),
  city: zod.string().min(1, "validation.cityRequired"),
  countryCode: zod.string().min(1, "validation.countryRequired"),
  firstName: zod.string().min(1, "validation.firstNameRequired"),
  lastName: zod.string().min(1, "validation.lastNameRequired"),
  postalCode: zod.string().min(1, "validation.postCodeRequired"),
  province: zod.string().max(ADDRESS_COLUMN_LENGTH.province).nullable().optional(),
})

const checkoutBaseSchema = baseAddressSchema.extend({
  billingAddress1: zod.string().optional(),
  billingCity: zod.string().optional(),
  billingCompanyName: zod.string().trim().max(COMPANY_NAME_MAX_LENGTH).optional(),
  billingCountryCode: zod.string().optional(),
  billingFirstName: zod.string().optional(),
  billingLastName: zod.string().optional(),
  billingNip: zod.string().overwrite(normalizeNip).optional(),
  billingPostalCode: zod.string().optional(),
  companyInvoice: zod.boolean().default(false),
  deliveryMethod: zod.string().min(1, "validation.deliveryRequired"),
  deliveryMethodType: zod.string().optional(),
  deliveryNotes: zod.string().optional(),
  discountCode: zod.string().trim().max(DISCOUNT_CODE_MAX_LENGTH).optional(),
  email: zod.email({
    message: "validation.emailInvalid",
  }),
  lockerCity: zod.string().optional(),
  lockerId: zod.string().optional(),
  phone: zod.string().min(1, "validation.phoneRequired").refine(isValidCheckoutPhone, {
    message: "validation.phoneInvalid",
  }),
  sameAsShipping: zod.boolean().default(true),
  saveBillingAddress: zod.boolean().default(false),
  saveShippingAddress: zod.boolean().default(false),
  storeLocation: zod.string().optional(),
})

export const checkoutSchema = checkoutBaseSchema.superRefine(refineCheckout)

export type CheckoutValues = zod.output<typeof checkoutBaseSchema>

export type CheckoutFormSchema = zod.input<typeof checkoutSchema>

export const checkoutMetadataMinorUnitsSchema = zod.string().regex(/^\d+$/u).transform(Number)

export const checkoutFulfillmentLinesSchema = zod.array(
  zod.object({
    handle: zod.string().optional(),
    imageUrl: zod.string().optional(),
    price: zod.number(),
    qty: zod.number(),
    title: zod.string(),
    variantId: zod.string(),
  }),
)

export type CheckoutFulfillmentLine = zod.infer<typeof checkoutFulfillmentLinesSchema>[number]
