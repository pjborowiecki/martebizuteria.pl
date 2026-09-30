import { createSchemaFactory } from "drizzle-zod"
import { isValidPhoneNumber } from "libphonenumber-js/mobile"
import zod from "zod/v4"

import { address } from "~/src/modules/address/address.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { DISCOUNT_CODE_MAX_LENGTH } from "~/src/modules/discount/discount.constants"

const isValidPostalCode = (countryCode: string, postalCode: string): boolean => {
  const pattern = POSTAL_CODE_PATTERNS[countryCode]

  return pattern === undefined ? true : pattern.test(postalCode.trim())
}

const isValidCheckoutPhone = (value: string): boolean => {
  try {
    return isValidPhoneNumber(value, DEFAULT_COUNTRY)
  } catch {
    return false
  }
}

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const COMPANY_NAME_MAX_LENGTH = 256

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
    address1: zod.string().min(1, "validation.addressRequired"),
    city: zod.string().min(1, "validation.cityRequired"),
    countryCode: zod.string().min(1, "validation.countryRequired"),
    firstName: zod.string().min(1, "validation.firstNameRequired"),
    lastName: zod.string().min(1, "validation.lastNameRequired"),
    postalCode: zod.string().min(1, "validation.postCodeRequired"),
  })

export const checkoutSchema = baseAddressSchema
  .extend({
    billingAddress1: zod.string().optional(),
    billingCity: zod.string().optional(),
    billingCompanyName: zod.string().trim().max(COMPANY_NAME_MAX_LENGTH).optional(),
    billingCountryCode: zod.string().optional(),
    billingFirstName: zod.string().optional(),
    billingLastName: zod.string().optional(),
    billingNip: zod
      .string()
      .trim()
      .regex(/^\d{10}$/u, "validation.nipInvalid")
      .optional()
      .or(zod.literal("")),
    billingPostalCode: zod.string().optional(),
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

export type CheckoutFormSchema = zod.input<typeof checkoutSchema>

export const checkoutZodSchemas = {
  insert: createInsertSchema(checkout),
  select: createSelectSchema(checkout),
  update: createUpdateSchema(checkout),
}
