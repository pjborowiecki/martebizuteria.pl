import { describe, expect, it } from "vite-plus/test"

import {
  SHEET_RESIZE_LIMITS,
  getMaxSheetWidthPx,
  hasStoredSheetWidth,
  resolveInitialSheetWidth,
  writeStoredSheetWidth,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/sheet-resize"

describe("sheet width without a browser", () => {
  it("falls back to the hard cap when there is no viewport to measure", () => {
    expect(getMaxSheetWidthPx()).toBe(SHEET_RESIZE_LIMITS.maxWidthPx)
  })

  it("still honours a caller supplied cap when there is no viewport", () => {
    expect(getMaxSheetWidthPx({ maxWidthPx: 640 })).toBe(640)
  })

  it("opens the sheet at its default width when no storage can be read", () => {
    expect(resolveInitialSheetWidth({ persistenceKey: "products" })).toBe(SHEET_RESIZE_LIMITS.defaultWidthPx)
  })

  it("opens the sheet at the caller's default width when no storage can be read", () => {
    expect(resolveInitialSheetWidth({ defaultWidthPx: 640, persistenceKey: "products" })).toBe(640)
  })

  it("reports no stored width to restore", () => {
    expect(hasStoredSheetWidth("products")).toBe(false)
  })

  it("drops a width it cannot persist instead of failing the render", () => {
    expect(() => {
      writeStoredSheetWidth("products", 720)
    }).not.toThrow()
    expect(hasStoredSheetWidth("products")).toBe(false)
  })
})
