import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"
import { LOCALES } from "~/src/integrations/use-intl/i18n.config"

import {
  PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN,
  PRODUCT_ATTRIBUTE_COLUMN_LENGTH,
  PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS,
  PRODUCT_ATTRIBUTE_HANDLE_PATTERN,
  PRODUCT_ATTRIBUTE_TYPES,
  productAttributeTypeUsesAllowedValues,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

const productAttributeLocaleMapShape = Object.fromEntries(
  LOCALES.map((locale) => [locale, z.string().trim().max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.title)]),
)

const productAttributeLocaleMapSchema = z.object(productAttributeLocaleMapShape)

export const productAttributeLocaleMapRequiredSchema = productAttributeLocaleMapSchema.superRefine((map, context) => {
  for (const locale of LOCALES) {
    if (map[locale].trim() === "") {
      context.addIssue({
        code: "custom",
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.localeTitleRequired,
        path: [locale],
      })
    }
  }
})

export const productAttributeAllowedValueSchema = z.object({
  labels: productAttributeLocaleMapRequiredSchema,
  value: z.string().trim().min(1).max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.allowedValueKey).regex(PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN),
})

const productAttributeSelectSchema = createSelectSchema(productAttribute)

const productAttributeIdSchema = z.string().trim().min(1).max(UUID_STRING_LENGTH)

const productAttributeCreateInputSchema = z
  .object({
    allowedValues: z.array(productAttributeAllowedValueSchema),
    handle: z
      .string()
      .trim()
      .min(1, {
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.handleRequired,
      })
      .regex(PRODUCT_ATTRIBUTE_HANDLE_PATTERN, {
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.handleInvalid,
      }),
    titles: productAttributeLocaleMapRequiredSchema,
    type: z.enum(PRODUCT_ATTRIBUTE_TYPES),
    unit: z.string().trim().max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.unit),
  })
  .superRefine((data, context) => {
    if (!productAttributeTypeUsesAllowedValues(data.type)) {
      return
    }
    if (data.allowedValues.length === 0) {
      context.addIssue({
        code: "custom",
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.allowedValuesRequired,
        path: ["allowedValues"],
      })
    }
  })

export const productAttributeFormSchema = () => productAttributeCreateInputSchema

export const productAttributeZodSchemas = {
  adminListItem: productAttributeSelectSchema.extend({
    productCount: z.number(),
  }),
  createInput: productAttributeCreateInputSchema,
  deleteInput: z.array(productAttributeIdSchema).min(1),
  insert: createInsertSchema(productAttribute),
  reorderInput: z.array(productAttributeIdSchema).min(1),
  select: productAttributeSelectSchema,
  stats: z.object({
    inUse: z.number(),
    total: z.number(),
    unused: z.number(),
    withChoices: z.number(),
  }),
  update: createUpdateSchema(productAttribute),
  updateInput: productAttributeCreateInputSchema.extend({
    id: productAttributeIdSchema,
  }),
}
