import { CHECKOUT_SHIPPING_LINE_ITEMS, STRIPE_CHECKOUT_LINE_ITEMS_MAX } from "~/src/integrations/stripe/stripe.constants"

export const CART_LINES_MAX = STRIPE_CHECKOUT_LINE_ITEMS_MAX - CHECKOUT_SHIPPING_LINE_ITEMS

export const CART_QUERY_KEYS = {
  AVAILABILITY: ["cart", "availability"] as const,
} as const
