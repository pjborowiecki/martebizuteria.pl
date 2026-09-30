import zod from "zod/v4"

import {
  CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH,
  CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH,
} from "~/src/modules/customer-activity/customer-activity.constants"

const cartItemAddedPayloadSchema = zod.object({
  kind: zod.literal("cart_item_added"),
  productTitle: zod.string().max(CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH),
  quantity: zod.number().int().positive(),
  variantId: zod.string().max(CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH),
  variantTitle: zod.string().max(CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH).optional(),
})

const cartAbandonedPayloadSchema = zod.object({
  itemCount: zod.number().int().nonnegative(),
  kind: zod.literal("cart_abandoned"),
  lineCount: zod.number().int().nonnegative(),
})

const pageViewedPayloadSchema = zod.object({
  kind: zod.literal("page_viewed"),
  path: zod.string().max(CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH),
})

export const customerActivityZodSchemas = {
  recordInput: zod.discriminatedUnion("kind", [cartItemAddedPayloadSchema, cartAbandonedPayloadSchema, pageViewedPayloadSchema]),
}
