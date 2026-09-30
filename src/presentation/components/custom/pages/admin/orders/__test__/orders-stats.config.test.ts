import { describe, expect, it } from "vite-plus/test"

import { ADMIN_ORDER_STAT_FILTER } from "~/src/modules/order/order.constants"

import { ORDER_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/orders/orders-stats.config"

describe("ORDER_STAT_CARDS", () => {
  it("shows the four order figures in a fixed order", () => {
    expect(ORDER_STAT_CARDS.map((card) => card.key)).toStrictEqual(["totalOrders", "pending", "revenueMinorUnits", "avgValueMinorUnits"])
  })

  it("makes only the counts clickable, because the money figures cannot filter the table", () => {
    expect(ORDER_STAT_CARDS.filter((card) => card.filter !== undefined).map((card) => card.key)).toStrictEqual(["totalOrders", "pending"])
  })

  it("wires each clickable card to its own table filter", () => {
    expect(ORDER_STAT_CARDS.find((card) => card.key === "totalOrders")?.filter).toBe(ADMIN_ORDER_STAT_FILTER.TOTAL)
    expect(ORDER_STAT_CARDS.find((card) => card.key === "pending")?.filter).toBe(ADMIN_ORDER_STAT_FILTER.PENDING)
  })

  it("gives every card its own icon and gradient", () => {
    expect(new Set(ORDER_STAT_CARDS.map((card) => card.gradient)).size).toBe(ORDER_STAT_CARDS.length)
    expect(new Set(ORDER_STAT_CARDS.map((card) => card.icon)).size).toBe(ORDER_STAT_CARDS.length)
  })

  it("fades every gradient out to transparent", () => {
    expect(ORDER_STAT_CARDS.every((card) => card.gradient.endsWith("to-transparent"))).toBe(true)
  })
})
