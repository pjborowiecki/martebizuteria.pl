import zod from "zod/v4"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN,
  PRODUCT_ATTRIBUTE_COLUMN_LENGTH,
  PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS,
  PRODUCT_ATTRIBUTE_HANDLE_PATTERN,
  PRODUCT_ATTRIBUTE_TYPES,
  productAttributeTypeUsesAllowedValues,
} from "~/src/modules/product-attribute/product-attribute.constants"

const productAttributeLocaleMapShape = Object.fromEntries(
  I18N.SUPPORTED_LOCALES.map((locale) => [locale, zod.string().trim().max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.title)]),
)

const productAttributeLocaleMapSchema = zod.object(productAttributeLocaleMapShape)

const productAttributeLocaleMapRequiredSchema = productAttributeLocaleMapSchema.superRefine((map, context) => {
  for (const locale of I18N.SUPPORTED_LOCALES) {
    if (map[locale].trim() === "") {
      context.addIssue({
        code: "custom",
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.localeTitleRequired,
        path: [locale],
      })
    }
  }
})

const productAttributeAllowedValueSchema = zod.object({
  labels: productAttributeLocaleMapRequiredSchema,
  value: zod.string().trim().min(1).max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.allowedValueKey).regex(PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN),
})

const productAttributeIdSchema = zod.string().trim().min(1).max(UUID_STRING_LENGTH)

const productAttributeCreateInputSchema = zod
  .object({
    allowedValues: zod.array(productAttributeAllowedValueSchema),
    handle: zod
      .string()
      .trim()
      .min(1, {
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.handleRequired,
      })
      .regex(PRODUCT_ATTRIBUTE_HANDLE_PATTERN, {
        message: PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS.handleInvalid,
      }),
    titles: productAttributeLocaleMapRequiredSchema,
    type: zod.enum(PRODUCT_ATTRIBUTE_TYPES),
    unit: zod.string().trim().max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.unit),
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

const productAttributeRawAllowedValueSchema = zod.object({
  labels: zod.record(zod.string(), zod.string()),
  value: zod.string(),
})

const productAttributeRawAllowedValuesSchema = zod.array(productAttributeRawAllowedValueSchema)

const productAttributeRawLocaleMapSchema = zod.record(zod.string(), zod.unknown())

export const productAttributeZodSchemas = {
  allowedValue: productAttributeAllowedValueSchema,
  createInput: productAttributeCreateInputSchema,
  deleteInput: zod.array(productAttributeIdSchema).min(1),
  localeMapRequired: productAttributeLocaleMapRequiredSchema,
  rawAllowedValues: productAttributeRawAllowedValuesSchema,
  rawLocaleMap: productAttributeRawLocaleMapSchema,
  reorderInput: zod.array(productAttributeIdSchema).min(1),
  stats: zod.object({
    inUse: zod.number(),
    total: zod.number(),
    unused: zod.number(),
    withChoices: zod.number(),
  }),
  updateInput: productAttributeCreateInputSchema.extend({
    id: productAttributeIdSchema,
  }),
}
