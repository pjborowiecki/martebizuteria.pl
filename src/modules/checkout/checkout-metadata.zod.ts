import zod from "zod/v4"

const STRIPE_METADATA_VALUE_LENGTH = 500

const ITEMS_CHUNK_KEY_PREFIX = "items"

const EMPTY_ITEMS_JSON = "[]"

export const toCheckoutSessionItemsMetadata = (lines: readonly CheckoutFulfillmentLine[]): Record<string, string> => {
  const json = JSON.stringify(lines)
  const chunks: string[] = []
  for (let start = 0; start < json.length; start += STRIPE_METADATA_VALUE_LENGTH) {
    chunks.push(json.slice(start, start + STRIPE_METADATA_VALUE_LENGTH))
  }

  return Object.fromEntries(chunks.map((chunk, index) => [`${ITEMS_CHUNK_KEY_PREFIX}${index}`, chunk]))
}

export const readCheckoutSessionItemsJson = (metadata: Record<string, string | undefined> | null | undefined): string => {
  if (metadata === null || metadata === undefined) {
    return EMPTY_ITEMS_JSON
  }

  const legacy = metadata[ITEMS_CHUNK_KEY_PREFIX]
  if (legacy !== undefined && legacy !== "") {
    return legacy
  }

  const chunks: string[] = []
  for (let index = 0; ; index += 1) {
    const chunk = metadata[`${ITEMS_CHUNK_KEY_PREFIX}${index}`]
    if (chunk === undefined) {
      break
    }
    chunks.push(chunk)
  }

  return chunks.length === 0 ? EMPTY_ITEMS_JSON : chunks.join("")
}

export const parseCheckoutSessionMetadataItems = (itemsJson: string): CheckoutFulfillmentLine[] =>
  checkoutFulfillmentLinesSchema.parse(JSON.parse(itemsJson))

export const parseCheckoutSessionReleaseLines = (itemsJson: string): CheckoutReleaseLine[] =>
  checkoutReleaseLinesSchema.parse(JSON.parse(itemsJson))

export const checkoutFulfillmentLinesSchema = zod.array(
  zod.object({
    handle: zod.string().optional(),
    imageUrl: zod.string().optional(),
    price: zod.number(),
    qty: zod.number(),
    title: zod.string(),
    variantId: zod.string(),
  }),
)

export const checkoutReleaseLinesSchema = zod.array(
  zod
    .object({
      qty: zod.number(),
      variantId: zod.string(),
    })
    .loose(),
)

export type CheckoutFulfillmentLine = zod.infer<typeof checkoutFulfillmentLinesSchema>[number]

export type CheckoutReleaseLine = zod.infer<typeof checkoutReleaseLinesSchema>[number]
