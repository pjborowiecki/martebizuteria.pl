import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vite-plus/test"

import {
  CUSTOMERS_DATA_GRID_KEY,
  customersDataGrid,
} from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

describe("customersDataGrid", () => {
  it("persists the admin customers table preferences under its own key", () => {
    expect(CUSTOMERS_DATA_GRID_KEY).toBe("admin.customers")
    expect(customersDataGrid.persistenceKey).toBe(CUSTOMERS_DATA_GRID_KEY)
  })

  it("refuses to hand out a table outside its provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => renderHook(() => customersDataGrid.useDataGrid())).toThrow("useDataGrid must be used within <DataGrid.Provider>")

    consoleError.mockRestore()
  })
})
