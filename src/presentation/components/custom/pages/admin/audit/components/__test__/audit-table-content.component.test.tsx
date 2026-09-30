import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AUDIT_DATA_GRID_KEY } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid"

vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-bulk-actions", () => ({
  AuditBulkActions: () => <p>bulk actions</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-date-filter", () => ({
  AuditDateFilter: () => <p>date filter</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-filters", () => ({
  AuditCategoryFilter: () => <p>category filter</p>,
  AuditSeverityFilter: () => <p>severity filter</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-refresh-action", () => ({
  AuditRefreshAction: () => <p>refresh action</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-stats", () => ({ AuditStats: () => <p>audit stats</p> }))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid", async () => {
  const { createColumnHelper, useTable } = await import("@tanstack/react-table")
  const { dataGridFeatures } = await import("~/src/presentation/components/custom/datagrid/lib/data-grid.features")
  const helper = createColumnHelper<typeof dataGridFeatures, { action: string; id: string }>()
  const columns = helper.columns([helper.accessor("action", { header: "Action", id: "action" })])

  return {
    useAuditDataGrid: () => {
      const table = useTable({
        columns,
        data: [
          { action: "product.created", id: "audit-1" },
          { action: "order.refunded", id: "audit-2" },
        ],
        features: dataGridFeatures,
        getRowId: (row: { id: string }) => row.id,
      })

      return {
        columnReorder: {
          draggedColumnId: undefined,
          onColumnDragEnd: () => {},
          onColumnDragOver: () => {},
          onColumnDragStart: () => {},
        },
        hasPreferenceOverrides: false,
        isLoading: false,
        persistenceKey: AUDIT_DATA_GRID_KEY,
        resetPreferences: () => {},
        rowReorder: undefined,
        searchPlaceholder: "Search the audit log",
        table,
      }
    },
  }
})

const { AuditTableContent } = await import("~/src/presentation/components/custom/pages/admin/audit/components/audit-table-content")

afterEach(() => {
  cleanup()
})

describe("AuditTableContent", () => {
  it("heads the page with the audit statistics", () => {
    renderWithProviders(<AuditTableContent />)

    expect(screen.getByText("audit stats")).toBeInTheDocument()
  })

  it("offers the refresh action and every audit facet in the toolbar", () => {
    renderWithProviders(<AuditTableContent />)

    expect(screen.getByText("refresh action")).toBeInTheDocument()
    expect(screen.getByText("category filter")).toBeInTheDocument()
    expect(screen.getByText("severity filter")).toBeInTheDocument()
    expect(screen.getByText("date filter")).toBeInTheDocument()
  })

  it("keeps the bulk actions in the toolbar action slot", () => {
    renderWithProviders(<AuditTableContent />)

    expect(screen.getByText("bulk actions")).toBeInTheDocument()
  })

  it("renders the audit rows the grid holds", () => {
    renderWithProviders(<AuditTableContent />)

    expect(screen.getByRole("columnheader", { name: "Drag to reorder Action column" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "product.created" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "order.refunded" })).toBeInTheDocument()
  })

  it("searches the audit log with its own placeholder", () => {
    renderWithProviders(<AuditTableContent />)

    expect(screen.getByPlaceholderText("Search the audit log")).toBeInTheDocument()
  })
})
