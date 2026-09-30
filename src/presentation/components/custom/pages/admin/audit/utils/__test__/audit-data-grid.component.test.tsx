import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { AUDIT_DATA_GRID_KEY, auditDataGrid } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid"

describe("auditDataGrid", () => {
  afterEach(() => {
    cleanup()
  })

  it("persists its preferences under the versioned audit key", () => {
    expect(auditDataGrid.persistenceKey).toBe(AUDIT_DATA_GRID_KEY)
    expect(AUDIT_DATA_GRID_KEY).toBe("admin.audit:v3")
  })

  it("refuses to expose its context outside a provider", () => {
    expect(() => renderHook(() => auditDataGrid.useDataGrid())).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })
})
