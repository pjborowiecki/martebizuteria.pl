import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  AUDIT_TABLE_CELL_INNER_CLASS,
  AuditTableCell,
} from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-table-cell"

afterEach(() => {
  cleanup()
})

describe("AuditTableCell", () => {
  it("renders whatever the column puts inside it", () => {
    renderWithProviders(
      <AuditTableCell>
        <span>ORD-1042</span>
      </AuditTableCell>,
    )

    expect(screen.getByText("ORD-1042")).toBeInTheDocument()
  })

  it("applies the shared cell geometry to the wrapper", () => {
    const { container } = renderWithProviders(<AuditTableCell>cell</AuditTableCell>)

    expect(container.firstChild).toHaveClass(...AUDIT_TABLE_CELL_INNER_CLASS.split(" "))
  })

  it("renders an empty wrapper rather than nothing when there are no children", () => {
    const { container } = renderWithProviders(<AuditTableCell>{undefined}</AuditTableCell>)

    expect(container.firstChild).toBeEmptyDOMElement()
  })
})

describe("AUDIT_TABLE_CELL_INNER_CLASS", () => {
  it("fixes the row height so every column lines up", () => {
    expect(AUDIT_TABLE_CELL_INNER_CLASS).toContain("h-9")
  })

  it("refuses to grow or shrink with its content", () => {
    expect(AUDIT_TABLE_CELL_INNER_CLASS).toContain("shrink-0")
    expect(AUDIT_TABLE_CELL_INNER_CLASS).toContain("min-w-0")
  })
})
