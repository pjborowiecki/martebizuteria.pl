import { createSchemaFactory } from "drizzle-zod"
import { isValidPhoneNumber } from "libphonenumber-js/mobile"
import { z } from "zod"

import { address } from "~/src/modules/address/address.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
const isValidPostalCode = (countryCode: string, postalCode: string): boolean => {
  const pattern = POSTAL_CODE_PATTERNS[countryCode]
  return pattern === undefined ? true : pattern.test(postalCode.trim())
}
// Delivery SMS requires a mobile number in the default country.
const isValidCheckoutPhone = (value: string): boolean => {
  try {
    return isValidPhoneNumber(value, DEFAULT_COUNTRY)
  } catch {
    return false
  }
}
const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})
const DEFAULT_COUNTRY = "PL"
const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  PL: /^\d{2}-\d{3}$/u,
}
const baseAddressSchema = createInsertSchema(address)
  .pick({
    address1: true,
    address2: true,
    city: true,
    countryCode: true,
    firstName: true,
    lastName: true,
    postalCode: true,
    province: true,
  })
  .extend({
    address1: z.string().min(1, "validation.addressRequired"),
    city: z.string().min(1, "validation.cityRequired"),
    countryCode: z.string().min(1, "validation.countryRequired"),
    firstName: z.string().min(1, "validation.firstNameRequired"),
    lastName: z.string().min(1, "validation.lastNameRequired"),
    postalCode: z.string().min(1, "validation.postCodeRequired"),
  })
export const checkoutSchema = baseAddressSchema
  .extend({
    billingAddress1: z.string().optional(),
    billingCity: z.string().optional(),
    billingCountryCode: z.string().optional(),
    billingFirstName: z.string().optional(),
    billingLastName: z.string().optional(),
    billingPostalCode: z.string().optional(),
    deliveryMethod: z.string().min(1, "validation.deliveryRequired"),
    deliveryMethodType: z.string().optional(),
    deliveryNotes: z.string().optional(),
    email: z.email({
      message: "validation.emailInvalid",
    }),
    // Restores the locker picker search; unused by server fulfillment.
    lockerCity: z.string().optional(),
    lockerId: z.string().optional(),
    phone: z.string().min(1, "validation.phoneRequired").refine(isValidCheckoutPhone, {
      message: "validation.phoneInvalid",
    }),
    sameAsShipping: z.boolean().default(true),
    saveBillingAddress: z.boolean().default(false),
    saveShippingAddress: z.boolean().default(false),
    storeLocation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.postalCode.length > 0 && !isValidPostalCode(data.countryCode, data.postalCode)) {
      ctx.addIssue({
        code: "custom",
        message: "validation.postCodeInvalid",
        path: ["postalCode"],
      })
    }
    if (!data.sameAsShipping) {
      if (typeof data.billingAddress1 !== "string" || data.billingAddress1.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "validation.addressRequired",
          path: ["billingAddress1"],
        })
      }
      if (typeof data.billingFirstName !== "string" || data.billingFirstName.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "validation.firstNameRequired",
          path: ["billingFirstName"],
        })
      }
      if (typeof data.billingLastName !== "string" || data.billingLastName.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "validation.lastNameRequired",
          path: ["billingLastName"],
        })
      }
      if (typeof data.billingCity !== "string" || data.billingCity.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "validation.cityRequired",
          path: ["billingCity"],
        })
      }
      if (typeof data.billingCountryCode !== "string" || data.billingCountryCode.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "validation.countryRequired",
          path: ["billingCountryCode"],
        })
      }
      if (typeof data.billingPostalCode !== "string" || data.billingPostalCode.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "validation.postCodeRequired",
          path: ["billingPostalCode"],
        })
      } else if (!isValidPostalCode(data.billingCountryCode ?? DEFAULT_COUNTRY, data.billingPostalCode)) {
        ctx.addIssue({
          code: "custom",
          message: "validation.postCodeInvalid",
          path: ["billingPostalCode"],
        })
      }
    }
    if (data.deliveryMethodType === "locker" && (typeof data.lockerId !== "string" || data.lockerId.trim().length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "validation.lockerIdRequired",
        path: ["lockerId"],
      })
    }
  })
export type CheckoutFormSchema = z.input<typeof checkoutSchema>
export const checkoutZodSchemas = {
  insert: createInsertSchema(checkout),
  select: createSelectSchema(checkout),
  update: createUpdateSchema(checkout),
}
