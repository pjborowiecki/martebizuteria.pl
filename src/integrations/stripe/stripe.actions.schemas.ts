import { z } from "zod"

import { turnstileTokenSchema } from "~/src/integrations/cloudflare-turnstile/turnstile.zod"

import { CART_LINES_MAX, CART_LINE_QUANTITY_MAX } from "~/src/modules/cart/cart.constants"
import { checkoutSchema } from "~/src/modules/checkout/checkout.zod"

const MIN_ITEMS_COUNT = 1

const MIN_CART_FIELD_LENGTH = 1

export const cartItemSchema = z.object({
  id: z.string().min(MIN_CART_FIELD_LENGTH),
  image: z.string(),
  qty: z.number().int().positive().max(CART_LINE_QUANTITY_MAX),
  slug: z.string().min(MIN_CART_FIELD_LENGTH),
  title: z.string(),
  variantId: z.string().min(MIN_CART_FIELD_LENGTH),
  variantTitle: z.string(),
})

export const createCheckoutSessionInputSchema = z.object({
  checkoutValues: checkoutSchema,
  items: z.array(cartItemSchema).min(MIN_ITEMS_COUNT).max(CART_LINES_MAX),
  turnstileToken: turnstileTokenSchema,
})

export const updateCheckoutSessionInputSchema = z.object({
  checkoutValues: checkoutSchema,
  items: z.array(cartItemSchema).min(MIN_ITEMS_COUNT).max(CART_LINES_MAX),
  sessionId: z.string().min(MIN_ITEMS_COUNT),
})

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionInputSchema>

export type UpdateCheckoutSessionInput = z.infer<typeof updateCheckoutSessionInputSchema>
