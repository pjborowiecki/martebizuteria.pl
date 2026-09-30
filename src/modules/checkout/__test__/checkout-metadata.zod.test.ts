import { describe, expect, it } from "vite-plus/test"

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

const STRIPE_METADATA_VALUE_LENGTH = 500

const STRIPE_METADATA_KEY_LIMIT = 50

const cartLine = (index: number): CheckoutFulfillmentLine => ({
  handle: `srebrny-pierscionek-z-labradorytem-${String(index)}`,
  imageUrl: `https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/0199a1b2-c3d4-7e5f-8901-23456789ab${String(index).padStart(2, "0")}.avif`,
  price: 19_900,
  qty: 1,
  title: `Srebrny pierścionek z labradorytem ${String(index)}`,
  variantId: `0199a1b2-c3d4-7e5f-8901-23456789ab${String(index).padStart(2, "0")}`,
})

const cart = (size: number): CheckoutFulfillmentLine[] => Array.from({ length: size }, (_, index) => cartLine(index))

describe("toCheckoutSessionItemsMetadata", () => {
  it.each([1, 2, 3, 8, 20])("keeps every value inside Stripe's 500 character limit for a cart of %i", (size) => {
    const metadata = toCheckoutSessionItemsMetadata(cart(size))

    for (const [key, value] of Object.entries(metadata)) {
      expect(value.length, `${key} is ${String(value.length)} characters`).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_LENGTH)
    }
  })

  it.each([1, 2, 3, 8, 20])("leaves room for the other metadata keys with a cart of %i", (size) => {
    const metadata = toCheckoutSessionItemsMetadata(cart(size))

    expect(Object.keys(metadata).length).toBeLessThan(STRIPE_METADATA_KEY_LIMIT)
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
