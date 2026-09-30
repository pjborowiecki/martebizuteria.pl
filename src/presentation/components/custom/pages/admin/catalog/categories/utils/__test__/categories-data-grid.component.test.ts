import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { ATTRIBUTES_DATA_GRID_KEY } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid"
import {
  CATEGORIES_DATA_GRID_KEY,
  categoriesDataGrid,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid"

describe("categoriesDataGrid", () => {
  afterEach(() => {
    cleanup()
  })

  it("persists its preferences under the categories key", () => {
    expect(categoriesDataGrid.persistenceKey).toBe(CATEGORIES_DATA_GRID_KEY)
    expect(CATEGORIES_DATA_GRID_KEY).toBe("admin.catalog.categories")
  })

  it("does not share its persistence key with another catalog grid", () => {
    expect(CATEGORIES_DATA_GRID_KEY).not.toBe(ATTRIBUTES_DATA_GRID_KEY)
  })

  it("refuses to expose its context outside a provider", () => {
    expect(() => renderHook(() => categoriesDataGrid.useDataGrid())).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })
})
