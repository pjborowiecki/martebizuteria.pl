import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import {
  CATEGORY_COLUMN_LENGTH,
  CATEGORY_FORM_VALIDATION_KEYS,
  CATEGORY_HANDLE_PATTERN,
  CATEGORY_MIN_LENGTH,
  CATEGORY_STATUSES,
  DEFAULT_CATEGORY_STATUS
} from "~/src/modules/category/category.constants";
import { category } from "~/src/modules/category/category.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

const categorySelectSchema = createSelectSchema(category);

const categoryIdSchema = z.string().trim().min(CATEGORY_MIN_LENGTH).max(CATEGORY_COLUMN_LENGTH.id);

const categoryCreateInputSchema = z.object({
  description: z.string().trim().max(CATEGORY_COLUMN_LENGTH.description).default(""),
  handle: z.string().trim().min(CATEGORY_MIN_LENGTH).regex(CATEGORY_HANDLE_PATTERN),
  image: z.string().trim().default(""),
  parentId: z.union([z.literal(""), z.uuid()]).default(""),
  shortDescription: z.string().trim().max(CATEGORY_COLUMN_LENGTH.shortDescription).default(""),
  status: z.enum(CATEGORY_STATUSES).default(DEFAULT_CATEGORY_STATUS),
  subtitle: z.string().trim().max(CATEGORY_COLUMN_LENGTH.subtitle).default(""),
  title: z.string().trim().min(CATEGORY_MIN_LENGTH).max(CATEGORY_COLUMN_LENGTH.title)
});

export function categoryFormSchema() {
  return z.object({
    description: z.string().trim().max(CATEGORY_COLUMN_LENGTH.description, {
      message: CATEGORY_FORM_VALIDATION_KEYS.descriptionTooLong
    }),
    handle: z
      .string()
      .trim()
      .min(CATEGORY_MIN_LENGTH, { message: CATEGORY_FORM_VALIDATION_KEYS.slugRequired })
      .regex(CATEGORY_HANDLE_PATTERN, { message: CATEGORY_FORM_VALIDATION_KEYS.slugInvalid }),
    image: z.string().trim(),
    parentId: z.union([z.literal(""), z.uuid()]),
    shortDescription: z.string().trim().max(CATEGORY_COLUMN_LENGTH.shortDescription, {
      message: CATEGORY_FORM_VALIDATION_KEYS.shortDescriptionTooLong
    }),
    status: z.enum(CATEGORY_STATUSES),
    subtitle: z.string().trim().max(CATEGORY_COLUMN_LENGTH.subtitle, {
      message: CATEGORY_FORM_VALIDATION_KEYS.subtitleTooLong
    }),
    title: z
      .string()
      .trim()
      .min(CATEGORY_MIN_LENGTH, { message: CATEGORY_FORM_VALIDATION_KEYS.titleRequired })
      .max(CATEGORY_COLUMN_LENGTH.title, { message: CATEGORY_FORM_VALIDATION_KEYS.titleTooLong })
  });
}

export const categoryZodSchemas = {
  adminListItem: categorySelectSchema.extend({
    parentTitle: z.string().optional(),
    productCount: z.number()
  }),
  createInput: categoryCreateInputSchema,
  deleteInput: z.array(categoryIdSchema).min(CATEGORY_MIN_LENGTH),
  insert: createInsertSchema(category),
  reorderInput: z.array(categoryIdSchema).min(CATEGORY_MIN_LENGTH),
  select: categorySelectSchema,
  stats: z.object({
    active: z.number(),
    avgProducts: z.number(),
    draft: z.number(),
    total: z.number()
  }),
  update: createUpdateSchema(category),
  updateInput: categoryCreateInputSchema.extend({
    id: categoryIdSchema
  })
};
