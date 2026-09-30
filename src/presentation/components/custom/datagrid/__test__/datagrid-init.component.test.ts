import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { DATAGRID_PREFS_INIT_SCRIPT } from "~/src/presentation/components/custom/datagrid/datagrid-init"
import { dataGridColumnWidthCssVar } from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-width"
import { STORAGE_PREFIX, dataGridPreferencesStorageKey } from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"

const runInitScript = (): void => {
  const script = document.createElement("script")
  script.textContent = DATAGRID_PREFS_INIT_SCRIPT
  document.head.insertBefore(script, null)
  script.remove()
}

const readVar = (name: string): string => document.documentElement.style.getPropertyValue(name)

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute("style")
})

afterEach(() => {
  document.documentElement.removeAttribute("style")
})

describe("DATAGRID_PREFS_INIT_SCRIPT", () => {
  it("restores stored column widths as css variables before hydration", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("admin.products"), JSON.stringify({ columnSizing: { sku: 120, title: 240 } }))

    runInitScript()

    expect(readVar(dataGridColumnWidthCssVar("admin.products", "title"))).toBe("240px")
    expect(readVar(dataGridColumnWidthCssVar("admin.products", "sku"))).toBe("120px")
  })

  it("names the variables exactly as the running grid reads them", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("admin:catalog.products"), JSON.stringify({ columnSizing: { title: 300 } }))

    runInitScript()

    expect(readVar("--marte-dg-admin-catalog-products-title")).toBe("300px")
    expect(readVar(dataGridColumnWidthCssVar("admin:catalog.products", "title"))).toBe("300px")
  })

  it("leaves the fixed layout columns to the stylesheet", () => {
    localStorage.setItem(
      dataGridPreferencesStorageKey("admin.products"),
      JSON.stringify({ columnSizing: { actions: 60, drag: 40, image: 80, select: 48, title: 240 } }),
    )

    runInitScript()

    for (const fixed of ["select", "drag", "image", "actions"]) {
      expect(readVar(dataGridColumnWidthCssVar("admin.products", fixed))).toBe("")
    }
    expect(readVar(dataGridColumnWidthCssVar("admin.products", "title"))).toBe("240px")
  })

  it("ignores widths that are not usable pixel numbers", () => {
    localStorage.setItem(
      dataGridPreferencesStorageKey("admin.products"),
      JSON.stringify({ columnSizing: { blank: "", negative: -10, title: 240, wide: "300", zero: 0 } }),
    )

    runInitScript()

    for (const columnId of ["blank", "negative", "wide", "zero"]) {
      expect(readVar(dataGridColumnWidthCssVar("admin.products", columnId))).toBe("")
    }
    expect(readVar(dataGridColumnWidthCssVar("admin.products", "title"))).toBe("240px")
  })

  it("restores every grid that has stored preferences", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("admin.products"), JSON.stringify({ columnSizing: { title: 240 } }))
    localStorage.setItem(dataGridPreferencesStorageKey("admin.orders"), JSON.stringify({ columnSizing: { total: 90 } }))

    runInitScript()

    expect(readVar(dataGridColumnWidthCssVar("admin.products", "title"))).toBe("240px")
    expect(readVar(dataGridColumnWidthCssVar("admin.orders", "total"))).toBe("90px")
  })

  it("skips preferences that hold no column sizing", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("admin.products"), JSON.stringify({ columnVisibility: { sku: false } }))

    runInitScript()

    expect(document.documentElement.getAttribute("style")).toBeNull()
  })

  it("ignores unrelated keys stored by other features", () => {
    localStorage.setItem("sidebar-preference", JSON.stringify({ columnSizing: { title: 240 } }))

    runInitScript()

    expect(document.documentElement.getAttribute("style")).toBeNull()
  })

  it("survives a corrupted preferences entry without throwing", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("admin.products"), "{not json")
    localStorage.setItem(dataGridPreferencesStorageKey("admin.orders"), JSON.stringify({ columnSizing: { total: 90 } }))

    expect(() => {
      runInitScript()
    }).not.toThrow()
  })

  it("carries the same storage prefix the preferences module writes with", () => {
    expect(DATAGRID_PREFS_INIT_SCRIPT).toContain(JSON.stringify(STORAGE_PREFIX))
  })
})
