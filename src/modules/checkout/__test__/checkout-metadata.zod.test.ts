import { describe, expect, it } from "vite-plus/test"

import { checkoutSession } from "~/src/integrations/stripe/__test__/fixtures/stripe-webhook-events"

import { checkoutFulfillmentLinesSchema, parseCheckoutSessionFulfillmentLines } from "~/src/modules/checkout/checkout-metadata.zod"

const SHIRT = { handle: "linen-shirt", imageUrl: "https://cdn.test/1.jpg", price: 19_900, qty: 2, title: "Linen shirt", variantId: "var_1" }

const CAP = { price: 1000, qty: 1, title: "Cap", variantId: "var_2" }

const sessionWith = (metadata: Record<string, string>) => checkoutSession({ metadata })

describe("parseCheckoutSessionFulfillmentLines for a session created before the cart moved to the database", () => {
  it("reads the lines the session carried in its items metadata", () => {
    const session = sessionWith({ items: JSON.stringify([SHIRT]) })

    expect(parseCheckoutSessionFulfillmentLines(session)).toStrictEqual([SHIRT])
  })

  it("joins the numbered chunks a larger cart was split into, in order", () => {
    const json = JSON.stringify([SHIRT, CAP])
    const middle = Math.floor(json.length / 2)

    const session = sessionWith({ items0: json.slice(0, middle), items1: json.slice(middle) })

    expect(parseCheckoutSessionFulfillmentLines(session)).toStrictEqual([SHIRT, CAP])
  })

  it("prefers the unsplit value when a session carries both shapes", () => {
    const metadata = { items: JSON.stringify([CAP]), items0: JSON.stringify([SHIRT]) }

    expect(parseCheckoutSessionFulfillmentLines(sessionWith(metadata))).toStrictEqual([CAP])
  })

  it("stops at the first missing chunk rather than skipping a lost one", () => {
    const session = sessionWith({ items0: JSON.stringify([CAP]), items2: "ignored" })

    expect(parseCheckoutSessionFulfillmentLines(session)).toStrictEqual([CAP])
  })

  it("reads no lines from a session created after the move, whose metadata names only the checkout", () => {
    expect(parseCheckoutSessionFulfillmentLines(sessionWith({ checkoutId: "checkout-1" }))).toStrictEqual([])
  })

  it("reads no lines from a session without metadata", () => {
    expect(parseCheckoutSessionFulfillmentLines(checkoutSession({ metadata: null }))).toStrictEqual([])
  })

  it("refuses lines whose price arrived as a string", () => {
    expect(() => parseCheckoutSessionFulfillmentLines(sessionWith({ items: JSON.stringify([{ ...CAP, price: "1000" }]) }))).toThrow()
  })

  it("refuses metadata that is not valid JSON", () => {
    expect(() => parseCheckoutSessionFulfillmentLines(sessionWith({ items: "{oops" }))).toThrow()
  })
})

describe("checkoutFulfillmentLinesSchema", () => {
  it("accepts a line without the optional presentation fields", () => {
    expect(checkoutFulfillmentLinesSchema.parse([CAP])).toStrictEqual([CAP])
  })

  it("drops keys a line does not declare", () => {
    expect(checkoutFulfillmentLinesSchema.parse([{ ...CAP, extra: true }])).toStrictEqual([CAP])
  })

  it("refuses a single object rather than a list", () => {
    expect(() => checkoutFulfillmentLinesSchema.parse(CAP)).toThrow()
  })
})
