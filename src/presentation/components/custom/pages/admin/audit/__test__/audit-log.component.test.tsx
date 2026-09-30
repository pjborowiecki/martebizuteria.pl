import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const rendered = vi.hoisted(() => ({ count: 0 }))

vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-table-content", () => ({
  AuditTableContent: (): JSX.Element => {
    rendered.count += 1

    return <output data-testid="audit-table">audit table</output>
  },
}))

import { AuditLog } from "~/src/presentation/components/custom/pages/admin/audit/audit-log"

afterEach(() => {
  cleanup()
  rendered.count = 0
})

describe("AuditLog", () => {
  it("shows the audit table", () => {
    renderWithProviders(<AuditLog />)

    expect(screen.getByTestId("audit-table")).toBeInTheDocument()
  })

  it("renders the table once and adds no chrome of its own", () => {
    const { container } = renderWithProviders(<AuditLog />)

    expect(rendered.count).toBe(1)
    expect(container.childElementCount).toBe(1)
  })
})
