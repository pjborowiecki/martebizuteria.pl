import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_INVENTORY_LEVEL, PRODUCT_STATUS } from "~/src/modules/product/product.constants"

import { PRODUCT_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/products/products-stats.config"

const cardFor = (key: string) => PRODUCT_STAT_CARDS.find((card) => card.key === key)

describe("PRODUCT_STAT_CARDS", () => {
  it("lists the total first, then the two statuses, then the stock warning", () => {
    expect(PRODUCT_STAT_CARDS.map((card) => card.key)).toStrictEqual(["total", "active", "draft", "lowStock"])
  })

  it("leaves the total card unfiltered, so it counts every product", () => {
    expect(cardFor("total")?.filterStatus).toBeUndefined()
    expect(cardFor("total")?.filterInventoryLevel).toBeUndefined()
  })

  it("filters the active card by the published status", () => {
    expect(cardFor("active")?.filterStatus).toBe(PRODUCT_STATUS.PUBLISHED)
    expect(cardFor("active")?.filterInventoryLevel).toBeUndefined()
  })

  it("filters the draft card by the draft status", () => {
    expect(cardFor("draft")?.filterStatus).toBe(PRODUCT_STATUS.DRAFT)
  })

  it("filters the low stock card by inventory level rather than status", () => {
    expect(cardFor("lowStock")?.filterInventoryLevel).toBe(PRODUCT_INVENTORY_LEVEL.LOW)
    expect(cardFor("lowStock")?.filterStatus).toBeUndefined()
  })

  it("gives every card its own icon, so no two cards look alike", () => {
    expect(new Set(PRODUCT_STAT_CARDS.map((card) => card.icon)).size).toBe(PRODUCT_STAT_CARDS.length)
  })

  it("gives every card a gradient that fades to transparent", () => {
    expect(PRODUCT_STAT_CARDS.every((card) => card.gradient.endsWith("to-transparent"))).toBe(true)
    expect(PRODUCT_STAT_CARDS.every((card) => card.gradient.startsWith("from-"))).toBe(true)
  })

  it("does not surface archived products as a card", () => {
    expect(PRODUCT_STAT_CARDS.some((card) => card.filterStatus === PRODUCT_STATUS.ARCHIVED)).toBe(false)
  })
})
