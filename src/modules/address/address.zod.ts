import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { address } from "~/src/modules/address/address.schema"

const COUNTRY_CODE_LENGTH = 2

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

export const addressZodSchemas = {
  insert: createInsertSchema(address),
  select: createSelectSchema(address),
  update: createUpdateSchema(address),
}

export const addressFieldsSchema = z.object({
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  countryCode: z.string().length(COUNTRY_CODE_LENGTH),
  firstName: z.string().optional(),
  isDefault: z.boolean().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional(),
})

export const addressIdInputSchema = z.object({ addressId: z.string().min(1) })
