import { describe, expect, it } from "vite-plus/test"

import { STRIPE_METADATA_KEYS_MAX, STRIPE_METADATA_VALUE_LENGTH_MAX } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CART_LINES_MAX } from "~/src/modules/cart/cart.constants"
import {
  type CheckoutFulfillmentLine,
  checkoutFulfillmentLinesSchema,
  checkoutReleaseLinesSchema,
  parseCheckoutSessionMetadataItems,
  parseCheckoutSessionReleaseLines,
  readCheckoutSessionItemsJson,
  toCheckoutSessionItemsMetadata,
} from "~/src/modules/checkout/checkout-metadata.zod"

describe("parseCheckoutSessionMetadataItems", () => {
  it("reads the lines Stripe carried in the session metadata", () => {
    const lines = parseCheckoutSessionMetadataItems(
      JSON.stringify([
        { handle: "linen-shirt", imageUrl: "https://cdn.test/1.jpg", price: 19_900, qty: 2, title: "Linen shirt", variantId: "var_1" },
      ]),
    )

    expect(lines).toStrictEqual([
      { handle: "linen-shirt", imageUrl: "https://cdn.test/1.jpg", price: 19_900, qty: 2, title: "Linen shirt", variantId: "var_1" },
    ])
  })

  it("accepts a line without the optional presentation fields", () => {
    expect(parseCheckoutSessionMetadataItems(JSON.stringify([{ price: 1000, qty: 1, title: "Cap", variantId: "var_2" }]))).toStrictEqual([
      { price: 1000, qty: 1, title: "Cap", variantId: "var_2" },
    ])
  })

  it("reads an empty basket as an empty line list", () => {
    expect(parseCheckoutSessionMetadataItems("[]")).toStrictEqual([])
  })

  it("refuses metadata whose price arrived as a string", () => {
    expect(() =>
      parseCheckoutSessionMetadataItems(JSON.stringify([{ price: "19900", qty: 1, title: "Cap", variantId: "var_2" }])),
    ).toThrow()
  })

  it("refuses metadata that is missing the variant the line refers to", () => {
    expect(() => parseCheckoutSessionMetadataItems(JSON.stringify([{ price: 1000, qty: 1, title: "Cap" }]))).toThrow()
  })

  it("refuses metadata that is not valid JSON", () => {
    expect(() => parseCheckoutSessionMetadataItems("{oops")).toThrow()
  })

  it("refuses metadata that is a single object rather than a list", () => {
    expect(() => parseCheckoutSessionMetadataItems(JSON.stringify({ price: 1000, qty: 1, title: "Cap", variantId: "var_2" }))).toThrow()
  })
})

describe("parseCheckoutSessionReleaseLines", () => {
  it("reads the quantities to return to stock", () => {
    expect(parseCheckoutSessionReleaseLines(JSON.stringify([{ qty: 3, variantId: "var_1" }]))).toStrictEqual([
      { qty: 3, variantId: "var_1" },
    ])
  })

  it("keeps the extra fields a fulfillment line carries so one payload serves both readers", () => {
    expect(parseCheckoutSessionReleaseLines(JSON.stringify([{ price: 1000, qty: 1, title: "Cap", variantId: "var_2" }]))).toStrictEqual([
      { price: 1000, qty: 1, title: "Cap", variantId: "var_2" },
    ])
  })

  it("refuses a release line with no quantity", () => {
    expect(() => parseCheckoutSessionReleaseLines(JSON.stringify([{ variantId: "var_1" }]))).toThrow()
  })
})

describe("the schemas behind the parsers", () => {
  it("strips nothing the fulfillment schema does not declare", () => {
    const parsed = checkoutFulfillmentLinesSchema.parse([{ extra: "ignored", price: 1000, qty: 1, title: "Cap", variantId: "var_2" }])

    expect(parsed[0]).toStrictEqual({ price: 1000, qty: 1, title: "Cap", variantId: "var_2" })
  })

  it("keeps unknown keys on the release schema", () => {
    const parsed = checkoutReleaseLinesSchema.parse([{ extra: "kept", qty: 1, variantId: "var_2" }])

    expect(parsed[0]).toStrictEqual({ extra: "kept", qty: 1, variantId: "var_2" })
  })
})

const CHECKOUT_PAYMENT_METADATA_KEYS_COUNT = 6

const ITEMS_KEYS_MAX = STRIPE_METADATA_KEYS_MAX - CHECKOUT_PAYMENT_METADATA_KEYS_COUNT

const CART_TOO_LARGE = { code: ERROR_CODES.VALIDATION, message: CHECKOUT_ERROR_CODES.CART_TOO_LARGE }

const cartLine = (index: number): CheckoutFulfillmentLine => ({
  handle: `srebrny-pierscionek-z-labradorytem-${String(index)}`,
  imageUrl: `https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/0199a1b2-c3d4-7e5f-8901-23456789ab${String(index).padStart(2, "0")}.avif`,
  price: 19_900,
  qty: 1,
  title: `Srebrny pierścionek z labradorytem ${String(index)}`,
  variantId: `0199a1b2-c3d4-7e5f-8901-23456789ab${String(index).padStart(2, "0")}`,
})

const cart = (size: number): CheckoutFulfillmentLine[] => Array.from({ length: size }, (_, index) => cartLine(index))

const shortCartLine = (index: number): CheckoutFulfillmentLine => ({
  handle: `pierscionek-${String(index)}`,
  imageUrl: `https://images.martebizuteria.pl/products/pierscionek-${String(index)}.webp`,
  price: 19_900,
  qty: 1,
  title: `Pierścionek ${String(index)}`,
  variantId: `0199a1b2-c3d4-7e5f-8901-${String(index).padStart(12, "0")}`,
})

const lineSerializedTo = (length: number): CheckoutFulfillmentLine => {
  const bare = { price: 1, qty: 1, title: "", variantId: "v" }

  return { ...bare, title: "x".repeat(length - JSON.stringify(bare).length) }
}

describe("toCheckoutSessionItemsMetadata", () => {
  it.each([1, 2, 3, 8, 20, 70])("keeps every value inside Stripe's 500 character limit for a cart of %i", (size) => {
    const metadata = toCheckoutSessionItemsMetadata(cart(size))

    for (const [key, value] of Object.entries(metadata)) {
      expect(value.length, `${key} is ${String(value.length)} characters`).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_LENGTH_MAX)
    }
  })

  it.each([1, 2, 3, 8, 20, 70])("leaves room for the checkout's own six keys with a cart of %i", (size) => {
    const metadata = toCheckoutSessionItemsMetadata(cart(size))

    expect(Object.keys(metadata).length).toBeLessThanOrEqual(ITEMS_KEYS_MAX)
  })

  it("carries the most lines the checkout takes when they are as short as the catalogue's own", () => {
    const lines = Array.from({ length: CART_LINES_MAX }, (_, index) => shortCartLine(index))
    const metadata = toCheckoutSessionItemsMetadata(lines)

    expect(Object.keys(metadata).length).toBeLessThanOrEqual(ITEMS_KEYS_MAX)
    expect(parseCheckoutSessionMetadataItems(readCheckoutSessionItemsJson(metadata))).toStrictEqual(lines)
  })

  it("refuses the most lines the checkout takes when their details no longer fit Stripe's metadata", () => {
    expect(() => toCheckoutSessionItemsMetadata(cart(CART_LINES_MAX))).toThrow(expect.objectContaining(CART_TOO_LARGE))
  })

  it("fills every key Stripe leaves beside the checkout's own and refuses a line more", () => {
    const fullValueLine = lineSerializedTo(STRIPE_METADATA_VALUE_LENGTH_MAX - 1)
    const fitting = Array.from({ length: ITEMS_KEYS_MAX - 1 }, () => fullValueLine)

    expect(JSON.stringify(fullValueLine)).toHaveLength(STRIPE_METADATA_VALUE_LENGTH_MAX - 1)
    expect(Object.keys(toCheckoutSessionItemsMetadata(fitting))).toHaveLength(ITEMS_KEYS_MAX)
    expect(() => toCheckoutSessionItemsMetadata([...fitting, fullValueLine])).toThrow(expect.objectContaining(CART_TOO_LARGE))
  })

  it("never splits a character that takes two code units across two values, which Stripe's client could not encode", () => {
    const opening = JSON.stringify([{ price: 1, qty: 1, title: "" }]).indexOf('""') + 1
    const lines = [
      { price: 1, qty: 1, title: `${"x".repeat(STRIPE_METADATA_VALUE_LENGTH_MAX - 1 - opening)}💍 i kolczyki`, variantId: "v" },
    ]
    const metadata = toCheckoutSessionItemsMetadata(lines)
    const values = Object.values(metadata)

    expect(values[0]).toHaveLength(STRIPE_METADATA_VALUE_LENGTH_MAX - 1)
    for (const value of values) {
      expect(value.isWellFormed()).toBe(true)
      expect(() => encodeURIComponent(value)).not.toThrow()
    }
    expect(parseCheckoutSessionMetadataItems(readCheckoutSessionItemsJson(metadata))).toStrictEqual(lines)
  })

  it("splits a two line cart that no longer fits one value", () => {
    const metadata = toCheckoutSessionItemsMetadata(cart(2))

    expect(Object.keys(metadata)).toStrictEqual(["items0", "items1"])
  })

  it("keeps a single line cart in one value", () => {
    const metadata = toCheckoutSessionItemsMetadata(cart(1))

    expect(Object.keys(metadata)).toStrictEqual(["items0"])
  })
})

describe("readCheckoutSessionItemsJson", () => {
  it.each([1, 2, 3, 8, 20])("round trips every line of a cart of %i", (size) => {
    const lines = cart(size)
    const itemsJson = readCheckoutSessionItemsJson(toCheckoutSessionItemsMetadata(lines))

    expect(parseCheckoutSessionMetadataItems(itemsJson)).toStrictEqual(lines)
  })

  it("still reads a session written before the lines were split", () => {
    const lines = cart(2)
    const itemsJson = readCheckoutSessionItemsJson({ items: JSON.stringify(lines) })

    expect(parseCheckoutSessionMetadataItems(itemsJson)).toStrictEqual(lines)
  })

  it("prefers the unsplit value when a session carries both shapes", () => {
    const legacy = cart(1)
    const itemsJson = readCheckoutSessionItemsJson({ items: JSON.stringify(legacy), ...toCheckoutSessionItemsMetadata(cart(3)) })

    expect(parseCheckoutSessionMetadataItems(itemsJson)).toStrictEqual(legacy)
  })

  it.each([undefined, null, {}])("reads no lines from %j", (metadata) => {
    expect(readCheckoutSessionItemsJson(metadata)).toBe("[]")
  })

  it("stops at the first gap rather than skipping a lost chunk", () => {
    expect(readCheckoutSessionItemsJson({ items0: "[", items2: "]" })).toBe("[")
  })

  it("releases the reserved quantities from a split cart", () => {
    const lines = cart(3)
    const itemsJson = readCheckoutSessionItemsJson(toCheckoutSessionItemsMetadata(lines))
    const released = parseCheckoutSessionReleaseLines(itemsJson)

    expect(released.map((line) => line.variantId)).toStrictEqual(lines.map((line) => line.variantId))
  })
})
