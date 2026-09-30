import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import {
  clearDataGridPreferences,
  readDataGridPreferences,
  writeDataGridPreferences,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("grid preferences without browser storage", () => {
  it("allows reading, saving, and resetting preferences during server rendering", () => {
    vi.stubGlobal("localStorage", undefined)
    const snapshot = { columnOrder: ["title"], columnSizing: { title: 240 }, columnVisibility: {} }

    expect(readDataGridPreferences("server.products")).toBeUndefined()
    expect(() => {
      writeDataGridPreferences("server.products", snapshot)
    }).not.toThrow()
    expect(() => {
      clearDataGridPreferences("server.products")
    }).not.toThrow()
  })
})
