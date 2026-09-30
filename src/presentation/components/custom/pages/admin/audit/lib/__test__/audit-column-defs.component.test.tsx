import { type JSX, useMemo } from "react"

import { flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AUDIT_LOG_TABLE_COLUMN_ID, AUDIT_LOG_TABLE_COLUMN_SIZE } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-row-actions", () => ({
  AuditRowActions: ({ eventLabel }: Readonly<{ eventLabel: string }>): JSX.Element => <span>{`actions for ${eventLabel}`}</span>,
}))

import { buildAuditColumns } from "~/src/presentation/components/custom/pages/admin/audit/lib/audit-column-defs"

type AuditRow = AuditLog["adminListItem"]

const auditRow = (overrides: Partial<AuditRow> = {}): AuditRow => ({
  action: "order.placed",
  actor: { id: "user-1", initials: "AK", name: "Anna Kowalska", role: "admin" },
  category: "orders",
  detail: "Order MB-1042 for 890,00 zl",
  id: "audit-1",
  ip: "192.0.2.10",
  resourceId: "order-1042",
  severity: "success",
  target: "Order MB-1042",
  timestamp: "2026-02-03 08:15",
  ...overrides,
})

const SELECTION_LABELS = { all: "Select all rows", row: "Select row" }

const ColumnsProbe = ({ row }: Readonly<{ row: AuditRow }>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const columns = useMemo(() => buildAuditColumns({ selectionLabels: SELECTION_LABELS, t }), [t])
  const table = useTable<DataGridFeatures, AuditRow>({
    columns,
    data: [row],
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  const [headerGroup] = table.getHeaderGroups()
  const [tableRow] = table.getRowModel().rows

  return (
    <div>
      <div>
        {headerGroup?.headers.map((header) => (
          <span key={header.id} data-testid={`head-${header.column.id}`}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
        ))}
      </div>
      <div>
        {tableRow?.getVisibleCells().map((cell) => (
          <span key={cell.id} data-testid={`cell-${cell.column.id}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </span>
        ))}
      </div>
    </div>
  )
}

const renderColumns = (overrides: Partial<AuditRow> = {}): void => {
  renderWithProviders(<ColumnsProbe row={auditRow(overrides)} />)
}

const cell = (id: string): HTMLElement => screen.getByTestId(`cell-${id}`)

const renderDefinitions = () => {
  const definitions: { current?: ReturnType<typeof buildAuditColumns> } = {}
  const Probe = (): null => {
    const t = useTranslations("pages.admin")
    definitions.current = buildAuditColumns({ selectionLabels: SELECTION_LABELS, t })

    return null
  }
  renderWithProviders(<Probe />)

  return new Map((definitions.current ?? []).map((column) => [column.id, column]))
}

afterEach(cleanup)

describe("buildAuditColumns layout", () => {
  it("lays the log out from the selection box to the row actions", () => {
    expect([...renderDefinitions().keys()]).toStrictEqual([
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

  it("sizes every column from the shared audit constants", () => {
    const byId = renderDefinitions()

    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.severity)?.size).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.severity)
    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.action)?.size).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.action)
    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.detail)?.size).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.detail)
    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.ip)?.size).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.ip)
  })

  it("lets the subject column take the leftover width without collapsing", () => {
    const target = renderDefinitions().get(AUDIT_LOG_TABLE_COLUMN_ID.target)

    expect(target?.minSize).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.targetMin)
    expect(target?.meta).toMatchObject({ fillsRemainingWidth: true })
  })

  it("lets the timestamp grow between its own bounds", () => {
    const timestamp = renderDefinitions().get(AUDIT_LOG_TABLE_COLUMN_ID.timestamp)

    expect(timestamp?.minSize).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.timestamp)
    expect(timestamp?.maxSize).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.timestampMax)
  })

  it("pins the row actions column to a fixed width and keeps it visible", () => {
    const actions = renderDefinitions().get(AUDIT_LOG_TABLE_COLUMN_ID.actions)

    expect(actions?.minSize).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.actions)
    expect(actions?.maxSize).toBe(AUDIT_LOG_TABLE_COLUMN_SIZE.actions)
    expect(actions?.enableHiding).toBe(false)
    expect(actions?.enableSorting).toBe(false)
  })

  it("stops a row click inside the row actions column", () => {
    expect(renderDefinitions().get(AUDIT_LOG_TABLE_COLUMN_ID.actions)?.meta).toMatchObject({ preventRowClick: true })
  })

  it("gives each column the skeleton shape its cell needs", () => {
    const byId = renderDefinitions()

    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.severity)?.meta).toMatchObject({ skeletonVariant: "badge" })
    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.category)?.meta).toMatchObject({ skeletonVariant: "badge" })
    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.target)?.meta).toMatchObject({ skeletonVariant: "recordId" })
    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.timestamp)?.meta).toMatchObject({ skeletonVariant: "date" })
    expect(byId.get(AUDIT_LOG_TABLE_COLUMN_ID.actions)?.meta).toMatchObject({ skeletonVariant: "iconEnd" })
  })
})

describe("buildAuditColumns headers", () => {
  it("translates every visible header", () => {
    renderColumns()

    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.severity}`)).toHaveTextContent("Status")
    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.action}`)).toHaveTextContent("Event")
    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.target}`)).toHaveTextContent("Subject")
    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.detail}`)).toHaveTextContent("Detail")
    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.category}`)).toHaveTextContent("Category")
    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.actor}`)).toHaveTextContent("Actor")
    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.ip}`)).toHaveTextContent("IP")
    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.timestamp}`)).toHaveTextContent("Timestamp")
  })

  it("keeps the row actions header for screen readers only", () => {
    renderColumns()

    expect(screen.getByTestId(`head-${AUDIT_LOG_TABLE_COLUMN_ID.actions}`)).toHaveTextContent("Row actions")
    expect(screen.getByText("Row actions")).toHaveClass("sr-only")
  })

  it("offers the select-all checkbox by its own label", () => {
    renderColumns()

    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument()
  })
})

describe("buildAuditColumns cells", () => {
  it("names the severity in the shop language", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.severity)).toHaveTextContent("Success")
  })

  it("colours the severity badge for its level", () => {
    renderColumns({ severity: "error" })

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.severity).querySelector('[data-slot="badge"]')).toHaveClass("bg-red-500/10")
  })

  it("turns a dotted action key into the translated event name", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.action)).toHaveTextContent("Order placed")
  })

  it("names the subject alongside the record it points at", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.target)).toHaveTextContent("Order MB-1042 (order-1042)")
  })

  it("names the subject alone when it carries no record of its own", () => {
    renderColumns({ resourceId: undefined })

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.target)).toHaveTextContent("Order MB-1042")
    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.target).textContent).not.toContain("(")
  })

  it("shows the recorded detail", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.detail)).toHaveTextContent("Order MB-1042 for 890,00 zl")
  })

  it("dashes out a detail the entry never recorded", () => {
    renderColumns({ detail: undefined })

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.detail)).toHaveTextContent("—")
  })

  it("names the category in the shop language", () => {
    renderColumns({ category: "catalog" })

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.category)).toHaveTextContent("Catalog")
  })

  it("shows the actor by name and initials", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.actor)).toHaveTextContent("Anna Kowalska")
    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.actor)).toHaveTextContent("AK")
  })

  it("colours the actor initials by the role behind the change", () => {
    renderColumns({ actor: { initials: "SY", name: "System", role: "system" } })

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.actor).querySelector('[data-slot="avatar-fallback"]')).toHaveClass("bg-secondary")
  })

  it("shows the calling IP address", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.ip)).toHaveTextContent("192.0.2.10")
  })

  it("dashes out a missing IP address", () => {
    renderColumns({ ip: undefined })

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.ip)).toHaveTextContent("—")
  })

  it("shows the timestamp exactly as the log recorded it", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.timestamp)).toHaveTextContent("2026-02-03 08:15")
  })

  it("hands the row actions the translated event name", () => {
    renderColumns()

    expect(cell(AUDIT_LOG_TABLE_COLUMN_ID.actions)).toHaveTextContent("actions for Order placed")
  })

  it("offers the row checkbox by its own label", () => {
    renderColumns()

    expect(screen.getByRole("checkbox", { name: "Select row" })).toBeInTheDocument()
  })
})
