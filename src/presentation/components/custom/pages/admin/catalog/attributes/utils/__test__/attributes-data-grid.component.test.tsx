import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { AUDIT_DATA_GRID_KEY } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid"
import {
  ATTRIBUTES_DATA_GRID_KEY,
  attributesDataGrid,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid"

describe("attributesDataGrid", () => {
  afterEach(() => {
    cleanup()
  })

  it("persists its preferences under the versioned attributes key", () => {
    expect(attributesDataGrid.persistenceKey).toBe(ATTRIBUTES_DATA_GRID_KEY)
    expect(ATTRIBUTES_DATA_GRID_KEY).toBe("admin.catalog.attributes:v6")
  })

  it("does not share its persistence key with another grid", () => {
    expect(ATTRIBUTES_DATA_GRID_KEY).not.toBe(AUDIT_DATA_GRID_KEY)
  })

  it("refuses to expose its context outside a provider", () => {
    expect(() => renderHook(() => attributesDataGrid.useDataGrid())).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })
})
