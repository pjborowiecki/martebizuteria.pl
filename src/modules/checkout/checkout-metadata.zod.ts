import { z } from "zod"

export const parseCheckoutSessionMetadataItems = (itemsJson: string): CheckoutFulfillmentLine[] =>
  checkoutFulfillmentLinesSchema.parse(JSON.parse(itemsJson))

export const parseCheckoutSessionReleaseLines = (itemsJson: string): CheckoutReleaseLine[] =>
  checkoutReleaseLinesSchema.parse(JSON.parse(itemsJson))

/** Line items stored in Stripe Checkout Session metadata (`metadata.items`). */
export const checkoutFulfillmentLinesSchema = z.array(
  z.object({
    handle: z.string().optional(),
    imageUrl: z.string().optional(),
    price: z.number(),
    qty: z.number(),
    title: z.string(),
    variantId: z.string(),
  }),
)

export const checkoutReleaseLinesSchema = z.array(
  z
    .object({
      qty: z.number(),
      variantId: z.string(),
    })
    .loose(),
)
export type CheckoutFulfillmentLine = z.infer<typeof checkoutFulfillmentLinesSchema>[number]
export type CheckoutReleaseLine = z.infer<typeof checkoutReleaseLinesSchema>[number]
