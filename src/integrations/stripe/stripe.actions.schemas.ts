import { z } from "zod"

import { CHECKOUT_SESSION_ID_MAX_LENGTH } from "~/src/integrations/stripe/stripe.constants"

import { CART_LINES_MAX, CART_LINE_QUANTITY_MAX } from "~/src/modules/cart/cart.constants"
import { checkoutSchema } from "~/src/modules/checkout/checkout.zod"
import { PRODUCT_VARIANT_COLUMN_LENGTH } from "~/src/modules/product-variant/product-variant.constants"
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"

const MIN_ITEMS_COUNT = 1

const MIN_CART_FIELD_LENGTH = 1

export const cartItemSchema = z.object({
  qty: z.number().int().positive().max(CART_LINE_QUANTITY_MAX),
  slug: z.string().min(MIN_CART_FIELD_LENGTH).max(PRODUCT_COLUMN_LENGTH.handle),
  variantId: z.string().min(MIN_CART_FIELD_LENGTH).max(PRODUCT_VARIANT_COLUMN_LENGTH.id),
})

export const createCheckoutSessionInputSchema = z.object({
  checkoutValues: checkoutSchema,
  items: z.array(cartItemSchema).min(MIN_ITEMS_COUNT).max(CART_LINES_MAX),
})

export const updateCheckoutSessionInputSchema = z.object({
  checkoutValues: checkoutSchema,
  items: z.array(cartItemSchema).min(MIN_ITEMS_COUNT).max(CART_LINES_MAX),
  sessionId: z.string().min(MIN_CART_FIELD_LENGTH).max(CHECKOUT_SESSION_ID_MAX_LENGTH),
})

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionInputSchema>

export type UpdateCheckoutSessionInput = z.infer<typeof updateCheckoutSessionInputSchema>
