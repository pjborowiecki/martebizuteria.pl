import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { address } from "~/src/modules/address/address.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { isValidCheckoutPhone, refineCheckout } from "~/src/modules/checkout/checkout.validation.utils"
import { DISCOUNT_CODE_MAX_LENGTH } from "~/src/modules/discount/discount.constants"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const COMPANY_NAME_MAX_LENGTH = 256

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

const checkoutBaseSchema = baseAddressSchema.extend({
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

export const checkoutSchema = checkoutBaseSchema.superRefine(refineCheckout)

export type CheckoutValues = zod.output<typeof checkoutBaseSchema>

export type CheckoutFormSchema = zod.input<typeof checkoutSchema>

export const checkoutZodSchemas = {
  insert: createInsertSchema(checkout),
  select: createSelectSchema(checkout),
  update: createUpdateSchema(checkout),
}
