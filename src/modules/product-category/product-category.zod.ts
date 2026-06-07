import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { LOCALES } from "~/src/constants/_constants/locales";

import {
  CATEGORY_COLUMN_LENGTH,
  CATEGORY_FORM_VALIDATION_KEYS,
  CATEGORY_HANDLE_PATTERN,
  CATEGORY_MIN_LENGTH,
  CATEGORY_STATUSES
} from "~/src/modules/product-category/product-category.constants";
import { productCategory } from "~/src/modules/product-category/product-category.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

const categoryInsertSchema = createInsertSchema(productCategory);
const categorySelectSchema = createSelectSchema(productCategory);

const categoryIdSchema = z.string().trim().min(CATEGORY_MIN_LENGTH).max(CATEGORY_COLUMN_LENGTH.id);

function categoryLocaleMapSchema(maxLength: number) {
  return z.object(Object.fromEntries(LOCALES.map((locale) => [locale, z.string().trim().max(maxLength)])));
}

function categoryLocaleMapRequiredSchema(maxLength: number) {
  return categoryLocaleMapSchema(maxLength).superRefine((map, context) => {
    for (const locale of LOCALES) {
      if (map[locale].trim() === "") {
        context.addIssue({
          code: "custom",
          message: CATEGORY_FORM_VALIDATION_KEYS.localeTitleRequired,
          path: [locale]
        });
      }
    }
  });
}

const categoryTitlesSchema = categoryLocaleMapRequiredSchema(CATEGORY_COLUMN_LENGTH.title);
const categorySubtitlesSchema = categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.subtitle);
const categoryShortDescriptionsSchema = categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.shortDescription);
const categoryDescriptionsSchema = categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.description);

const categoryCreateInputSchema = z.object({
  descriptions: categoryDescriptionsSchema,
  handle: z.string().trim().min(CATEGORY_MIN_LENGTH).regex(CATEGORY_HANDLE_PATTERN),
  image: z.string().trim().default(""),
  parentId: z.union([z.literal(""), z.uuid()]).default(""),
  shortDescriptions: categoryShortDescriptionsSchema,
  status: z.enum(CATEGORY_STATUSES),
  subtitles: categorySubtitlesSchema,
  titles: categoryTitlesSchema
});

export function categoryFormSchema() {
  return z.object({
    descriptions: z.object(
      Object.fromEntries(
        (["pl", "en"] as const).map((locale) => [
          locale,
          z.string().trim().max(CATEGORY_COLUMN_LENGTH.description, {
            message: CATEGORY_FORM_VALIDATION_KEYS.descriptionTooLong
          })
        ])
      )
    ),
    handle: z
      .string()
      .trim()
      .min(CATEGORY_MIN_LENGTH, { message: CATEGORY_FORM_VALIDATION_KEYS.slugRequired })
      .regex(CATEGORY_HANDLE_PATTERN, { message: CATEGORY_FORM_VALIDATION_KEYS.slugInvalid }),
    image: z.string().trim(),
    parentId: z.union([z.literal(""), z.uuid()]),
    shortDescriptions: z.object(
      Object.fromEntries(
        (["pl", "en"] as const).map((locale) => [
          locale,
          z.string().trim().max(CATEGORY_COLUMN_LENGTH.shortDescription, {
            message: CATEGORY_FORM_VALIDATION_KEYS.shortDescriptionTooLong
          })
        ])
      )
    ),
    status: z.enum(CATEGORY_STATUSES),
    subtitles: z.object(
      Object.fromEntries(
        (["pl", "en"] as const).map((locale) => [
          locale,
          z.string().trim().max(CATEGORY_COLUMN_LENGTH.subtitle, {
            message: CATEGORY_FORM_VALIDATION_KEYS.subtitleTooLong
          })
        ])
      )
    ),
    titles: categoryTitlesSchema
  });
}

export const categoryZodSchemas = {
  adminListItem: categorySelectSchema.extend({
    parentTitles: categoryLocaleMapSchema(CATEGORY_COLUMN_LENGTH.title).optional(),
    productCount: z.number()
  }),
  createInput: categoryCreateInputSchema,
  deleteInput: z.array(categoryIdSchema).min(CATEGORY_MIN_LENGTH),
  insert: categoryInsertSchema,
  reorderInput: z.array(categoryIdSchema).min(CATEGORY_MIN_LENGTH),
  select: categorySelectSchema,
  stats: z.object({
    active: z.number(),
    avgProducts: z.number(),
    draft: z.number(),
    total: z.number()
  }),
  update: createUpdateSchema(productCategory),
  updateInput: categoryCreateInputSchema.extend({
    id: categoryIdSchema
  })
};
