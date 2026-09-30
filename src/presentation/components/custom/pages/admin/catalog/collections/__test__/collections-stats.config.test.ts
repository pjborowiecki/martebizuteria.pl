import { describe, expect, it } from "vite-plus/test"

import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"

import { COLLECTION_STAT_CARDS } from "../collections-stats.config"

describe("COLLECTION_STAT_CARDS", () => {
  it("covers every key of the collection stats payload", () => {
    expect(COLLECTION_STAT_CARDS.map((card) => card.key)).toStrictEqual(["total", "active", "draft", "avgProducts"])
  })

  it("only filters the cards that map onto a collection status", () => {
    expect(COLLECTION_STAT_CARDS.map((card) => card.filterStatus)).toStrictEqual([
      undefined,
      COLLECTION_STATUS.ACTIVE,
      COLLECTION_STATUS.DRAFT,
      undefined,
    ])
  })

  it("gives every card its own gradient and icon", () => {
    expect(new Set(COLLECTION_STAT_CARDS.map((card) => card.gradient)).size).toBe(COLLECTION_STAT_CARDS.length)
    expect(new Set(COLLECTION_STAT_CARDS.map((card) => card.icon)).size).toBe(COLLECTION_STAT_CARDS.length)
  })

  it("anchors each gradient transparently so the cards stack on any background", () => {
    expect(COLLECTION_STAT_CARDS.every((card) => card.gradient.startsWith("from-") && card.gradient.endsWith("to-transparent"))).toBe(true)
  })
})
