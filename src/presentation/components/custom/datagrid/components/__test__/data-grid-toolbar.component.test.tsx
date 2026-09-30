import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridToolbar } from "~/src/presentation/components/custom/datagrid/components/data-grid-toolbar"

import { DataGridHarness } from "./data-grid-harness"

const RESET_LABEL = "Reset table settings to defaults"

const renderToolbar = ({
  actions,
  filters,
  hasPreferenceOverrides = false,
}: {
  actions?: boolean
  filters?: boolean
  hasPreferenceOverrides?: boolean
} = {}) =>
  renderWithProviders(
    <DataGridHarness>
      {(table) => (
        <DataGridToolbar
          actions={actions === true ? <button type="button">Add product</button> : undefined}
          filters={filters === true ? <span>Status filter</span> : undefined}
          hasPreferenceOverrides={hasPreferenceOverrides}
          onResetPreferences={vi.fn<() => void>()}
          searchPlaceholder="Search products"
          table={table}
        >
          <span>Bulk actions</span>
        </DataGridToolbar>
      )}
    </DataGridHarness>,
  )

describe("DataGridToolbar", () => {
  afterEach(() => {
    cleanup()
  })

  it("always offers search, column visibility and layout reset", () => {
    renderToolbar()

    expect(screen.getByRole("searchbox", { name: "Search products" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show or hide columns" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: RESET_LABEL })).toBeInTheDocument()
  })

  it("keeps the reset control inert until a preference has been overridden", () => {
    renderToolbar()

    expect(screen.getByRole("button", { name: RESET_LABEL })).toBeDisabled()
  })

  it("enables the reset control once a preference differs from the defaults", () => {
    renderToolbar({ hasPreferenceOverrides: true })

    expect(screen.getByRole("button", { name: RESET_LABEL })).toBeEnabled()
  })

  it("renders the extra controls passed as children next to the search field", () => {
    renderToolbar()

    expect(screen.getByText("Bulk actions")).toBeInTheDocument()
  })

  it("renders page actions when they are supplied", () => {
    renderToolbar({ actions: true })

    expect(screen.getByRole("button", { name: "Add product" })).toBeInTheDocument()
  })

  it("omits the filter row entirely when no filters are supplied", () => {
    renderToolbar()

    expect(screen.queryByText("Status filter")).toBeNull()
  })

  it("renders the filter row when filters are supplied", () => {
    renderToolbar({ filters: true })

    expect(screen.getByText("Status filter")).toBeInTheDocument()
  })
})
