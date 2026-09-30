import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_ATTRIBUTE_STAT_FILTER } from "~/src/modules/product-attribute/product-attribute.constants"

import { PRODUCT_ATTRIBUTE_STAT_CARDS } from "../attributes-stats.config"

describe("PRODUCT_ATTRIBUTE_STAT_CARDS", () => {
  it("covers every key of the attribute stats payload", () => {
    expect(PRODUCT_ATTRIBUTE_STAT_CARDS.map((card) => card.key)).toStrictEqual(["total", "inUse", "unused", "withChoices"])
  })

  it("leaves the total card unfiltered and maps the rest onto the shared filter values", () => {
    expect(PRODUCT_ATTRIBUTE_STAT_CARDS.map((card) => card.filterStat)).toStrictEqual([
      undefined,
      PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE,
      PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED,
      PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE,
    ])
  })

  it("gives every card its own gradient and icon", () => {
    const gradients = PRODUCT_ATTRIBUTE_STAT_CARDS.map((card) => card.gradient)
    const icons = PRODUCT_ATTRIBUTE_STAT_CARDS.map((card) => card.icon)

    expect(new Set(gradients).size).toBe(PRODUCT_ATTRIBUTE_STAT_CARDS.length)
    expect(new Set(icons).size).toBe(PRODUCT_ATTRIBUTE_STAT_CARDS.length)
  })
})
