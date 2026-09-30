import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { MIN_FIELD_LENGTH, pageField, pageSizeField, searchTermField, uuidField } from "~/src/modules/_core/utils/zod-fields"
import {
  DISCOUNT_CODE_MAX_LENGTH,
  DISCOUNT_CODE_MIN_LENGTH,
  DISCOUNT_DESCRIPTION_MAX_LENGTH,
  DISCOUNT_PERCENTAGE_MAX,
  DISCOUNT_TYPE,
  DISCOUNT_TYPES,
} from "~/src/modules/discount/discount.constants"
import { discount } from "~/src/modules/discount/discount.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const codeField = zod
  .string()
  .trim()
  .min(DISCOUNT_CODE_MIN_LENGTH, "validation.codeTooShort")
  .max(DISCOUNT_CODE_MAX_LENGTH, "validation.codeTooLong")
  .regex(/^[\dA-Z_-]+$/iu, "validation.codeCharacters")

const optionalDateField = zod.iso.datetime({ offset: true }).optional().or(zod.literal(""))

const optionalPositiveAmount = zod.number().int().positive().optional()

const adminDiscountFormValues = zod
  .object({
    code: codeField,
    description: zod.string().trim().max(DISCOUNT_DESCRIPTION_MAX_LENGTH).optional(),
    endsAt: optionalDateField,
    isActive: zod.boolean().default(true),
    maxDiscountAmount: optionalPositiveAmount,
    minOrderTotal: optionalPositiveAmount,
    perCustomerLimit: zod.number().int().positive().optional(),
    startsAt: optionalDateField,
    type: zod.enum(DISCOUNT_TYPES),
    usageLimit: zod.number().int().positive().optional(),
    value: zod.number().int().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.type === DISCOUNT_TYPE.PERCENTAGE && (data.value < MIN_FIELD_LENGTH || data.value > DISCOUNT_PERCENTAGE_MAX)) {
      ctx.addIssue({ code: "custom", message: "validation.percentageRange", path: ["value"] })
    }

    if (data.type === DISCOUNT_TYPE.FIXED_AMOUNT && data.value < MIN_FIELD_LENGTH) {
      ctx.addIssue({ code: "custom", message: "validation.amountRequired", path: ["value"] })
    }

    const startsAt = data.startsAt === undefined || data.startsAt === "" ? undefined : new Date(data.startsAt)
    const endsAt = data.endsAt === undefined || data.endsAt === "" ? undefined : new Date(data.endsAt)
    if (startsAt !== undefined && endsAt !== undefined && endsAt.getTime() <= startsAt.getTime()) {
      ctx.addIssue({ code: "custom", message: "validation.endBeforeStart", path: ["endsAt"] })
    }
  })

export const discountZodSchemas = {
  adminDiscountFormValues,
  adminDiscountsPageInput: zod.object({
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
    search: searchTermField.optional(),
  }),
  createDiscountInput: zod.object({ values: adminDiscountFormValues }),
  deleteDiscountsInput: zod.object({ ids: zod.array(uuidField).min(MIN_FIELD_LENGTH) }),
  insert: createInsertSchema(discount),
  select: createSelectSchema(discount),
  update: createUpdateSchema(discount),
  updateDiscountInput: zod.object({ id: uuidField, values: adminDiscountFormValues }),
  validateDiscountInput: zod.object({
    code: codeField,
    email: zod.email().optional(),
    itemsSubtotal: zod.number().int().min(0),
    shippingTotal: zod.number().int().min(0),
  }),
}
