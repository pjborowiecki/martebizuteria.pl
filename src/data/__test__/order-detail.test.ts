import { describe, expect, it } from "vite-plus/test"

import {
  DEMO_FULFILLMENT_STEPS,
  DEMO_LINE_ITEMS,
  DEMO_ORDER,
  DEMO_SUMMARY,
  DEMO_TIMELINE,
  EMAIL_STATUS_CONFIG,
  ORDER_PAYMENT_STYLES,
  ORDER_STATUS_STYLES,
  TIMELINE_ICONS,
  TIMELINE_KEY_SLICE_LENGTH,
} from "~/src/data/order-detail"

describe("DEMO_ORDER", () => {
  it("has a style entry for its own status and payment state", () => {
    expect(ORDER_STATUS_STYLES[DEMO_ORDER.status]).toBeDefined()
    expect(ORDER_PAYMENT_STYLES[DEMO_ORDER.payment]).toBeDefined()
  })
})

describe("DEMO_LINE_ITEMS", () => {
  it("gives every line its own sku", () => {
    const skus = DEMO_LINE_ITEMS.map((item) => item.sku)

    expect(new Set(skus).size).toBe(skus.length)
  })

  it("matches the line total to price times quantity", () => {
    for (const item of DEMO_LINE_ITEMS) {
      const price = Number(item.price.replaceAll(/[$,]/gu, ""))
      const total = Number(item.total.replaceAll(/[$,]/gu, ""))

      expect(total).toBeCloseTo(price * item.qty, 2)
    }
  })

  it("sums the line totals to the summary subtotal", () => {
    const sum = DEMO_LINE_ITEMS.reduce((accumulator, item) => accumulator + Number(item.total.replaceAll(/[$,]/gu, "")), 0)

    expect(sum).toBeCloseTo(Number(DEMO_SUMMARY.subtotal.replaceAll(/[$,]/gu, "")), 2)
  })
})

describe("DEMO_FULFILLMENT_STEPS", () => {
  it("dates every completed step and leaves pending ones undated", () => {
    for (const step of DEMO_FULFILLMENT_STEPS) {
      expect(step.date === undefined).toBe(!step.done)
    }
  })

  it("keeps completed steps before pending ones", () => {
    const firstPending = DEMO_FULFILLMENT_STEPS.findIndex((step) => !step.done)
    const lastDone = DEMO_FULFILLMENT_STEPS.map((step) => step.done).lastIndexOf(true)

    expect(lastDone).toBeLessThan(firstPending)
  })

  it("gives every step its own key", () => {
    const keys = DEMO_FULFILLMENT_STEPS.map((step) => step.key)

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("DEMO_TIMELINE", () => {
  it("has an icon for every event type it uses", () => {
    for (const event of DEMO_TIMELINE) {
      expect(TIMELINE_ICONS[event.type]).toBeDefined()
    }
  })

  it("only carries a delivery status on email events", () => {
    for (const event of DEMO_TIMELINE) {
      if (event.status !== undefined) {
        expect(event.type).toBe("email")
        expect(EMAIL_STATUS_CONFIG[event.status]).toBeDefined()
      }
    }
  })

  it("keeps the descriptions distinguishable within the timeline key slice", () => {
    const slices = DEMO_TIMELINE.map((event) => `${event.date}${event.description.slice(0, TIMELINE_KEY_SLICE_LENGTH)}`)

    expect(new Set(slices).size).toBe(slices.length)
  })
})

describe("EMAIL_STATUS_CONFIG", () => {
  it("colours failures red and delivery green", () => {
    expect(EMAIL_STATUS_CONFIG["bounced"]?.className).toBe("text-red-500")
    expect(EMAIL_STATUS_CONFIG["failed"]?.className).toBe("text-red-500")
    expect(EMAIL_STATUS_CONFIG["delivered"]?.className).toBe("text-emerald-500")
  })
})
