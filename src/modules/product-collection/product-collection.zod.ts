import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { LOCALES } from "~/src/constants/_constants/locales";

import {
  COLLECTION_COLUMN_LENGTH,
  COLLECTION_FORM_VALIDATION_KEYS,
  COLLECTION_HANDLE_PATTERN,
  COLLECTION_MIN_LENGTH,
  COLLECTION_STATUSES
} from "~/src/modules/product-collection/product-collection.constants";
import { productCollection } from "~/src/modules/product-collection/product-collection.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

const collectionInsertSchema = createInsertSchema(productCollection);
const collectionSelectSchema = createSelectSchema(productCollection);

function collectionLocaleMapSchema(maxLength: number) {
  return z.object(Object.fromEntries(LOCALES.map((locale) => [locale, z.string().trim().max(maxLength)])));
}

function collectionLocaleMapRequiredSchema(maxLength: number) {
  return collectionLocaleMapSchema(maxLength).superRefine((map, context) => {
    for (const locale of LOCALES) {
      if (map[locale].trim() === "") {
        context.addIssue({
          code: "custom",
          message: COLLECTION_FORM_VALIDATION_KEYS.localeTitleRequired,
          path: [locale]
        });
      }
    }
  });
}

const collectionTitlesSchema = collectionLocaleMapRequiredSchema(COLLECTION_COLUMN_LENGTH.title);
const collectionDescriptionsSchema = collectionLocaleMapSchema(COLLECTION_COLUMN_LENGTH.description);

const collectionCreateInputSchema = z.object({
  descriptions: collectionDescriptionsSchema,
  handle: z.string().trim().min(COLLECTION_MIN_LENGTH).regex(COLLECTION_HANDLE_PATTERN),
  image: z.string().trim().default(""),
  status: z.enum(COLLECTION_STATUSES),
  titles: collectionTitlesSchema
});

/** Client-side form schema. Validation `message` values are admin i18n keys, not literal copy. */
export function collectionFormSchema() {
  return z.object({
    descriptions: z.object(
      Object.fromEntries(
        (["pl", "en"] as const).map((locale) => [
          locale,
          z.string().trim().max(COLLECTION_COLUMN_LENGTH.description, {
            message: COLLECTION_FORM_VALIDATION_KEYS.descriptionTooLong
          })
        ])
      )
    ),
    handle: z
      .string()
      .trim()
      .min(COLLECTION_MIN_LENGTH, { message: COLLECTION_FORM_VALIDATION_KEYS.slugRequired })
      .regex(COLLECTION_HANDLE_PATTERN, { message: COLLECTION_FORM_VALIDATION_KEYS.slugInvalid }),
    image: z.string().trim(),
    status: z.enum(COLLECTION_STATUSES),
    titles: collectionTitlesSchema
  });
}

export const collectionZodSchemas = {
  adminListItem: collectionSelectSchema.extend({
    productCount: z.number()
  }),
  createInput: collectionCreateInputSchema,
  deleteInput: z.array(z.uuid()).min(COLLECTION_MIN_LENGTH),
  insert: collectionInsertSchema,
  reorderInput: z.array(z.uuid()).min(COLLECTION_MIN_LENGTH),
  select: collectionSelectSchema,
  stats: z.object({
    active: z.number(),
    avgProducts: z.number(),
    draft: z.number(),
    total: z.number()
  }),
  update: createUpdateSchema(productCollection),
  updateInput: collectionCreateInputSchema.extend({
    id: z.uuid()
  })
};
