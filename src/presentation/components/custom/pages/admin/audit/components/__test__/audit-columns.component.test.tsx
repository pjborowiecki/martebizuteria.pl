import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { constructTable, flexRender, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { cleanup, renderHook, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { AUDIT_LOG_TABLE_COLUMN_ID } from "~/src/modules/audit-log/audit-log.constants"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-row-actions", () => ({
  AuditRowActions: (): JSX.Element => <span>row actions</span>,
}))

import { useAuditColumns } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-columns"

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    {children}
  </TestProviders>
)

const renderColumns = () => renderHook(() => useAuditColumns(), { wrapper })

const AuditHeaderRow = (): JSX.Element => {
  const columns = useAuditColumns()
  const table = constructTable({ columns, data: [], features })

  return (
    <div>
      {table
        .getHeaderGroups()
        .flatMap((group) => group.headers)
        .map((header) => (
          <div key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</div>
        ))}
    </div>
  )
}

afterEach(() => {
  cleanup()
})

describe("useAuditColumns", () => {
  it("builds the audit log table in reading order", () => {
    const { result } = renderColumns()

    expect(result.current.map((column) => column.id)).toStrictEqual([
      "select",
      AUDIT_LOG_TABLE_COLUMN_ID.severity,
      AUDIT_LOG_TABLE_COLUMN_ID.action,
      AUDIT_LOG_TABLE_COLUMN_ID.target,
      AUDIT_LOG_TABLE_COLUMN_ID.detail,
      AUDIT_LOG_TABLE_COLUMN_ID.category,
      AUDIT_LOG_TABLE_COLUMN_ID.actor,
      AUDIT_LOG_TABLE_COLUMN_ID.ip,
      AUDIT_LOG_TABLE_COLUMN_ID.timestamp,
      AUDIT_LOG_TABLE_COLUMN_ID.actions,
    ])
  })

  it("translates the headers into the active locale", () => {
    const { result } = renderColumns()
    const headers = new Map(result.current.map((column) => [column.id, column.header]))

    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.severity)).toBe("Status")
    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.action)).toBe("Event")
    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.target)).toBe("Subject")
    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.detail)).toBe("Detail")
    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.category)).toBe("Category")
    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.actor)).toBe("Actor")
    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.ip)).toBe("IP")
    expect(headers.get(AUDIT_LOG_TABLE_COLUMN_ID.timestamp)).toBe("Timestamp")
  })

  it("names the select-all checkbox for screen readers", () => {
    renderWithProviders(<AuditHeaderRow />)

    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument()
  })

  it("hides the row action header behind screen-reader-only text", () => {
    renderWithProviders(<AuditHeaderRow />)

    expect(screen.getByText("Row actions")).toHaveClass("sr-only")
  })

  it("keeps the same column definitions across renders", () => {
    const { rerender, result } = renderColumns()
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
