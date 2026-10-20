import zod from "zod/v4"

export const COUNTRY_CODE_LENGTH = 2

export const addressFieldsSchema = zod.object({
  address1: zod.string().min(1),
  address2: zod.string().optional(),
  city: zod.string().min(1),
  countryCode: zod.string().length(COUNTRY_CODE_LENGTH),
  firstName: zod.string().optional(),
  isDefault: zod.boolean().optional(),
  lastName: zod.string().optional(),
  phone: zod.string().optional(),
  postalCode: zod.string().optional(),
  province: zod.string().optional(),
})

export const addressIdInputSchema = zod.object({ addressId: zod.string().min(1) })
