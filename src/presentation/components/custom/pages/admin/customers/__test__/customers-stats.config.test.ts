import { describe, expect, it } from "vite-plus/test"

import { ADMIN_CUSTOMER_STAT_FILTER } from "~/src/modules/user/user.constants"

import { CUSTOMER_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/customers/customers-stats.config"

describe("CUSTOMER_STAT_CARDS", () => {
  it("lists the statistics in the order they are shown", () => {
    expect(CUSTOMER_STAT_CARDS.map((card) => card.key)).toStrictEqual(["total", "returningRate", "averageLtv", "averageProductsPerOrder"])
  })

  it("only makes the total and returning cards filterable", () => {
    expect(CUSTOMER_STAT_CARDS.map((card) => card.filter)).toStrictEqual([
      ADMIN_CUSTOMER_STAT_FILTER.TOTAL,
      ADMIN_CUSTOMER_STAT_FILTER.RETURNING,
      undefined,
      undefined,
    ])
  })

  it("gives every card its own gradient", () => {
    const gradients = CUSTOMER_STAT_CARDS.map((card) => card.gradient)

    expect(new Set(gradients).size).toBe(gradients.length)
  })

  it("gives every card a distinct icon", () => {
    const icons = CUSTOMER_STAT_CARDS.map((card) => card.icon)

    expect(new Set(icons).size).toBe(icons.length)
  })
})
