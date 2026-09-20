import { z } from "zod/v4"

import {
  CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH,
  CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH,
} from "~/src/modules/customer-activity/customer-activity.constants"

const cartItemAddedPayloadSchema = z.object({
  kind: z.literal("cart_item_added"),
  productTitle: z.string().max(CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH),
  quantity: z.number().int().positive(),
  variantId: z.string().max(CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH),
  variantTitle: z.string().max(CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH).optional(),
})

const cartAbandonedPayloadSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  kind: z.literal("cart_abandoned"),
  lineCount: z.number().int().nonnegative(),
})

const pageViewedPayloadSchema = z.object({
  kind: z.literal("page_viewed"),
  path: z.string().max(CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH),
})

export const customerActivityZodSchemas = {
  recordInput: z.discriminatedUnion("kind", [cartItemAddedPayloadSchema, cartAbandonedPayloadSchema, pageViewedPayloadSchema]),
}
