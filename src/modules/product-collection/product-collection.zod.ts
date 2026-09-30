import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { handleField } from "~/src/modules/_core/utils/zod-fields"
import {
  COLLECTION_COLUMN_LENGTH,
  COLLECTION_FORM_VALIDATION_KEYS,
  COLLECTION_HANDLE_PATTERN,
  COLLECTION_MIN_LENGTH,
  COLLECTION_STATUSES,
} from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const collectionInsertSchema = createInsertSchema(productCollection)

const collectionSelectSchema = createSelectSchema(productCollection)

const collectionLocaleMapSchema = (maxLength: number, tooLongMessage?: string) =>
  zod.object(Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, zod.string().trim().max(maxLength, tooLongMessage)])))

const collectionLocaleMapRequiredSchema = (maxLength: number) =>
  collectionLocaleMapSchema(maxLength).superRefine((map, context) => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      if (map[locale].trim() === "") {
        context.addIssue({
          code: "custom",
          message: COLLECTION_FORM_VALIDATION_KEYS.localeTitleRequired,
          path: [locale],
        })
      }
    }
  })

const collectionTitlesSchema = collectionLocaleMapRequiredSchema(COLLECTION_COLUMN_LENGTH.title)

const collectionShortDescriptionsSchema = collectionLocaleMapSchema(COLLECTION_COLUMN_LENGTH.shortDescription)

const collectionDescriptionsSchema = collectionLocaleMapSchema(COLLECTION_COLUMN_LENGTH.description)

const collectionCreateInputSchema = zod.object({
  descriptions: collectionDescriptionsSchema,
  handle: zod.string().trim().min(COLLECTION_MIN_LENGTH).regex(COLLECTION_HANDLE_PATTERN),
  image: zod.string().trim().default(""),
  shortDescriptions: collectionShortDescriptionsSchema,
  status: zod.enum(COLLECTION_STATUSES),
  titles: collectionTitlesSchema,
})

const collectionFormValuesSchema = zod.object({
  descriptions: collectionLocaleMapSchema(COLLECTION_COLUMN_LENGTH.description, COLLECTION_FORM_VALIDATION_KEYS.descriptionTooLong),
  handle: zod
    .string()
    .trim()
    .min(COLLECTION_MIN_LENGTH, {
      message: COLLECTION_FORM_VALIDATION_KEYS.slugRequired,
    })
    .regex(COLLECTION_HANDLE_PATTERN, {
      message: COLLECTION_FORM_VALIDATION_KEYS.slugInvalid,
    }),
  image: zod.string().trim(),
  shortDescriptions: collectionLocaleMapSchema(
    COLLECTION_COLUMN_LENGTH.shortDescription,
    COLLECTION_FORM_VALIDATION_KEYS.shortDescriptionTooLong,
  ),
  status: zod.enum(COLLECTION_STATUSES),
  titles: collectionTitlesSchema,
})

export const productCollectionZodSchemas = {
  adminListItem: collectionSelectSchema.extend({
    productCount: zod.number(),
  }),
  createInput: collectionCreateInputSchema,
  deleteInput: zod.array(zod.uuid()).min(COLLECTION_MIN_LENGTH),
  formValues: collectionFormValuesSchema,
  handleInput: handleField,
  insert: collectionInsertSchema,
  reorderInput: zod.array(zod.uuid()).min(COLLECTION_MIN_LENGTH),
  select: collectionSelectSchema,
  stats: zod.object({
    active: zod.number(),
    avgProducts: zod.number(),
    draft: zod.number(),
    total: zod.number(),
  }),
  update: createUpdateSchema(productCollection),
  updateInput: collectionCreateInputSchema.extend({
    id: zod.uuid(),
  }),
}
