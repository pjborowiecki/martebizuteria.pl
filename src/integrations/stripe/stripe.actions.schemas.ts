import { z } from "zod"

import { checkoutSchema } from "~/src/modules/checkout/checkout.zod"

const MIN_ITEMS_COUNT = 1
const MIN_CART_FIELD_LENGTH = 1

export const cartItemSchema = z.object({
  id: z.string().min(MIN_CART_FIELD_LENGTH),
  image: z.string(),
  price: z.string(),
  qty: z.number().positive(),
  rawPrice: z.number().nonnegative(),
  slug: z.string().min(MIN_CART_FIELD_LENGTH),
  title: z.string(),
  variantId: z.string().min(MIN_CART_FIELD_LENGTH),
  variantTitle: z.string(),
})

export const createCheckoutSessionInputSchema = z.object({
  checkoutValues: checkoutSchema,
  items: z.array(cartItemSchema).min(MIN_ITEMS_COUNT),
})

export const updateCheckoutSessionInputSchema = z.object({
  checkoutValues: checkoutSchema,
  items: z.array(cartItemSchema).min(MIN_ITEMS_COUNT),
  sessionId: z.string().min(MIN_ITEMS_COUNT),
})

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionInputSchema>
export type UpdateCheckoutSessionInput = z.infer<typeof updateCheckoutSessionInputSchema>
