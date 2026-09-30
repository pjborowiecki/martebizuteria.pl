import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { address } from "~/src/modules/address/address.schema"

export const COUNTRY_CODE_LENGTH = 2

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

export const addressZodSchemas = {
  insert: createInsertSchema(address),
  select: createSelectSchema(address),
  update: createUpdateSchema(address),
}

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
