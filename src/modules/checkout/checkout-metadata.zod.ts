import { z } from "zod";

/** Line items stored in Stripe Checkout Session metadata (`metadata.items`). */
export const checkoutFulfillmentLinesSchema = z.array(
  z.object({
    handle: z.string().optional(),
    imageUrl: z.string().optional(),
    price: z.number(),
    qty: z.number(),
    title: z.string(),
    variantId: z.string()
  })
);

/** Variant/qty pairs used when releasing reserved inventory. */
export const checkoutReleaseLinesSchema = z.array(z.object({ qty: z.number(), variantId: z.string() }).loose());

export type CheckoutFulfillmentLine = z.infer<typeof checkoutFulfillmentLinesSchema>[number];
export type CheckoutReleaseLine = z.infer<typeof checkoutReleaseLinesSchema>[number];

export function parseCheckoutSessionMetadataItems(itemsJson: string): CheckoutFulfillmentLine[] {
  return checkoutFulfillmentLinesSchema.parse(JSON.parse(itemsJson));
}

export function parseCheckoutSessionReleaseLines(itemsJson: string): CheckoutReleaseLine[] {
  return checkoutReleaseLinesSchema.parse(JSON.parse(itemsJson));
}
