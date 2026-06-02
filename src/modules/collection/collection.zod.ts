import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import {
  COLLECTION_FORM_VALIDATION_KEYS,
  COLLECTION_HANDLE_PATTERN,
  COLLECTION_COLUMN_LENGTH,
  COLLECTION_MIN_LENGTH,
  COLLECTION_STATUSES,
  DEFAULT_COLLECTION_STATUS
} from "~/src/modules/collection/collection.constants";
import { collection } from "~/src/modules/collection/collection.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

const collectionSelectSchema = createSelectSchema(collection);

const collectionCreateInputSchema = z.object({
  description: z.string().trim().max(COLLECTION_COLUMN_LENGTH.description).default(""),
  handle: z.string().trim().min(COLLECTION_MIN_LENGTH).regex(COLLECTION_HANDLE_PATTERN),
  image: z.string().trim().default(""),
  status: z.enum(COLLECTION_STATUSES).default(DEFAULT_COLLECTION_STATUS),
  title: z.string().trim().min(COLLECTION_MIN_LENGTH).max(COLLECTION_COLUMN_LENGTH.title)
});

/** Client-side form schema. Validation `message` values are admin i18n keys, not literal copy. */
export function collectionFormSchema() {
  return z.object({
    description: z.string().trim().max(COLLECTION_COLUMN_LENGTH.description, {
      message: COLLECTION_FORM_VALIDATION_KEYS.descriptionTooLong
    }),
    handle: z
      .string()
      .trim()
      .min(COLLECTION_MIN_LENGTH, { message: COLLECTION_FORM_VALIDATION_KEYS.slugRequired })
      .regex(COLLECTION_HANDLE_PATTERN, { message: COLLECTION_FORM_VALIDATION_KEYS.slugInvalid }),
    image: z.string().trim(),
    status: z.enum(COLLECTION_STATUSES),
    title: z
      .string()
      .trim()
      .min(COLLECTION_MIN_LENGTH, { message: COLLECTION_FORM_VALIDATION_KEYS.nameRequired })
      .max(COLLECTION_COLUMN_LENGTH.title, { message: COLLECTION_FORM_VALIDATION_KEYS.nameTooLong })
  });
}

export const collectionZodSchemas = {
  adminListItem: collectionSelectSchema.extend({
    productCount: z.number()
  }),
  createInput: collectionCreateInputSchema,
  deleteInput: z.array(z.string().min(COLLECTION_MIN_LENGTH)).min(COLLECTION_MIN_LENGTH),
  insert: createInsertSchema(collection),
  reorderInput: z.array(z.string().min(COLLECTION_MIN_LENGTH)).min(COLLECTION_MIN_LENGTH),
  select: collectionSelectSchema,
  stats: z.object({
    active: z.number(),
    avgProducts: z.number(),
    draft: z.number(),
    total: z.number()
  }),
  update: createUpdateSchema(collection),
  updateInput: collectionCreateInputSchema.extend({
    id: z.string().min(COLLECTION_MIN_LENGTH)
  })
};
