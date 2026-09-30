import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { handleField } from "~/src/modules/_core/utils/zod-fields"
import {
  CATEGORY_COLUMN_LENGTH,
  CATEGORY_FORM_VALIDATION_KEYS,
  CATEGORY_HANDLE_PATTERN,
  CATEGORY_MIN_LENGTH,
  CATEGORY_STATUSES,
} from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const categoryInsertSchema = createInsertSchema(productCategory)

const categorySelectSchema = createSelectSchema(productCategory)

const categoryIdSchema = zod.string().trim().min(CATEGORY_MIN_LENGTH).max(CATEGORY_COLUMN_LENGTH.id)

const categoryLocaleMapSchema = (maxLength: number, tooLongMessage?: string) =>
  zod.object(Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, zod.string().trim().max(maxLength, tooLongMessage)])))

const categoryLocaleMapRequiredSchema = (maxLength: number) =>
  categoryLocaleMapSchema(maxLength).superRefine((map, context) => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      if (map[locale].trim() === "") {
        context.addIssue({
          code: "custom",
          message: CATEGORY_FORM_VALIDATION_KEYS.localeTitleRequired,
          path: [locale],
        })
      }
    }
  })

const categoryTitlesSchema = categoryLocaleMapRequiredSchema(CATEGORY_COLUMN_LENGTH.title)

const categorySubtitlesSchema = categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.subtitle)

const categoryShortDescriptionsSchema = categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.shortDescription)

const categoryDescriptionsSchema = categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.description)

const categoryCreateInputSchema = zod.object({
  descriptions: categoryDescriptionsSchema,
  handle: zod.string().trim().min(CATEGORY_MIN_LENGTH).regex(CATEGORY_HANDLE_PATTERN),
  image: zod.string().trim().default(""),
  parentId: zod.union([zod.literal(""), zod.uuid()]).default(""),
  shortDescriptions: categoryShortDescriptionsSchema,
  status: zod.enum(CATEGORY_STATUSES),
  subtitles: categorySubtitlesSchema,
  titles: categoryTitlesSchema,
})

const categoryFormValuesSchema = zod.object({
  descriptions: categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.description, CATEGORY_FORM_VALIDATION_KEYS.descriptionTooLong),
  handle: zod
    .string()
    .trim()
    .min(CATEGORY_MIN_LENGTH, {
      message: CATEGORY_FORM_VALIDATION_KEYS.slugRequired,
    })
    .regex(CATEGORY_HANDLE_PATTERN, {
      message: CATEGORY_FORM_VALIDATION_KEYS.slugInvalid,
    }),
  image: zod.string().trim(),
  parentId: zod.union([zod.literal(""), zod.uuid()]),
  shortDescriptions: categoryLocaleMapSchema(
    CATEGORY_COLUMN_LENGTH.shortDescription,
    CATEGORY_FORM_VALIDATION_KEYS.shortDescriptionTooLong,
  ),
  status: zod.enum(CATEGORY_STATUSES),
  subtitles: categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.subtitle, CATEGORY_FORM_VALIDATION_KEYS.subtitleTooLong),
  titles: categoryTitlesSchema,
})

export const productCategoryZodSchemas = {
  adminListItem: categorySelectSchema.extend({
    parentTitles: categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.title).optional(),
    productCount: zod.number(),
  }),
  createInput: categoryCreateInputSchema,
  deleteInput: zod.array(categoryIdSchema).min(CATEGORY_MIN_LENGTH),
  formValues: categoryFormValuesSchema,
  handleInput: handleField,
  insert: categoryInsertSchema,
  reorderInput: zod.array(categoryIdSchema).min(CATEGORY_MIN_LENGTH),
  select: categorySelectSchema,
  stats: zod.object({
    active: zod.number(),
    avgProducts: zod.number(),
    draft: zod.number(),
    total: zod.number(),
  }),
  update: createUpdateSchema(productCategory),
  updateInput: categoryCreateInputSchema.extend({
    id: categoryIdSchema,
  }),
}
