import { describe, expect, it } from "vite-plus/test"

import { AUDIT_STAT_CARDS } from "../audit-stats.config"

describe("AUDIT_STAT_CARDS", () => {
  it("lists the four audit summary cards in reading order", () => {
    expect(AUDIT_STAT_CARDS.map((card) => card.key)).toStrictEqual(["total", "today", "warnings", "errors"])
  })

  it("only attaches a severity filter to the severity specific cards", () => {
    expect(AUDIT_STAT_CARDS.map((card) => card.filterSeverity)).toStrictEqual([undefined, undefined, "warning", "error"])
  })

  it("gives every card its own gradient and icon", () => {
    const gradients = AUDIT_STAT_CARDS.map((card) => card.gradient)
    const icons = AUDIT_STAT_CARDS.map((card) => card.icon)

    expect(new Set(gradients).size).toBe(AUDIT_STAT_CARDS.length)
    expect(new Set(icons).size).toBe(AUDIT_STAT_CARDS.length)
  })
})
