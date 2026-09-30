import { describe, expect, it } from "vite-plus/test"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"

import { CATEGORY_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/categories/categories-stats.config"

describe("CATEGORY_STAT_CARDS", () => {
  it("gives every card its own stat key", () => {
    const keys = CATEGORY_STAT_CARDS.map((card) => card.key)

    expect(keys).toStrictEqual(["total", "active", "draft", "avgProducts"])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("gives every card its own icon", () => {
    const icons = CATEGORY_STAT_CARDS.map((card) => card.icon)

    expect(new Set(icons).size).toBe(icons.length)
  })

  it("filters only on the status cards, each by its matching status", () => {
    const filters = new Map(CATEGORY_STAT_CARDS.map((card) => [card.key, card.filterStatus]))

    expect(filters.get("active")).toBe(CATEGORY_STATUS.ACTIVE)
    expect(filters.get("draft")).toBe(CATEGORY_STATUS.DRAFT)
    expect(filters.get("total")).toBeUndefined()
    expect(filters.get("avgProducts")).toBeUndefined()
  })

  it("gives every card a gradient that fades to transparent", () => {
    for (const card of CATEGORY_STAT_CARDS) {
      expect(card.gradient.startsWith("from-")).toBe(true)
      expect(card.gradient.endsWith("to-transparent")).toBe(true)
    }
  })
})
