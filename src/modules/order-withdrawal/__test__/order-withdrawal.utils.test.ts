import { describe, expect, it } from "vite-plus/test"

import {
  coversWholeOrder,
  describeWithdrawnItems,
  isOrderWithdrawalOpen,
  presentText,
} from "~/src/modules/order-withdrawal/order-withdrawal.utils"

const NOW = new Date("2026-10-10T12:00:00.000Z")

describe("isOrderWithdrawalOpen", () => {
  it.each(["processing", "completed"] as const)("lets a customer withdraw from a %s order that has not been delivered yet", (status) => {
    expect(isOrderWithdrawalOpen({ deliveredAt: null, status }, NOW)).toBe(true)
  })

  it.each([
    {
      closedFrom: "2026-10-15T22:00:00.000Z",
      deliveredAt: "2026-10-01T15:00:00.000Z",
      openUntil: "2026-10-15T21:59:59.999Z",
      period: "to the end of the fourteenth day after delivery in Polish time",
    },
    {
      closedFrom: "2026-10-19T22:00:00.000Z",
      deliveredAt: "2026-10-03T08:00:00.000Z",
      openUntil: "2026-10-19T21:59:59.999Z",
      period: "to the end of the next Monday when the fourteenth day is a Saturday",
    },
    {
      closedFrom: "2026-10-30T23:00:00.000Z",
      deliveredAt: "2026-10-15T22:30:00.000Z",
      openUntil: "2026-10-30T22:59:59.999Z",
      period: "to midnight in winter time when the clocks go back during the period",
    },
  ])("keeps the function open $period", ({ closedFrom, deliveredAt, openUntil }) => {
    const completedOrder = { deliveredAt: new Date(deliveredAt), status: "completed" } as const

    expect(isOrderWithdrawalOpen(completedOrder, new Date(openUntil))).toBe(true)
    expect(isOrderWithdrawalOpen(completedOrder, new Date(closedFrom))).toBe(false)
  })

  it.each(["pending", "cancelled", "refunded"] as const)("leaves nothing to withdraw from in a %s order", (status) => {
    expect(isOrderWithdrawalOpen({ deliveredAt: null, status }, NOW)).toBe(false)
  })
})

describe("coversWholeOrder", () => {
  it("knows when a statement already withdrew from the whole order", () => {
    expect(coversWholeOrder([{ scope: "items" }, { scope: "order" }])).toBe(true)
  })

  it("leaves the rest of the order open after statements for some products", () => {
    expect(coversWholeOrder([{ scope: "items" }])).toBe(false)
    expect(coversWholeOrder([])).toBe(false)
  })
})

describe("describeWithdrawnItems", () => {
  it("names each chosen line with its variant and quantity, one per line", () => {
    expect(
      describeWithdrawnItems([
        { quantity: 1, title: "Naszyjnik Lapis", variantTitle: "Złoto" },
        { quantity: 2, title: "Kolczyki Luna", variantTitle: null },
      ]),
    ).toBe("Naszyjnik Lapis — Złoto × 1\nKolczyki Luna × 2")
  })
})

describe("presentText", () => {
  it("keeps text the customer wrote and drops an empty field", () => {
    expect(presentText("Too small")).toBe("Too small")
    expect(presentText("")).toBeUndefined()
  })
})
