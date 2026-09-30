import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { formatAdminAuditTarget } from "~/src/modules/audit-log/audit-log.utils"

import { AuditTargetCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-target-cell"

afterEach(() => {
  cleanup()
})

describe("AuditTargetCell without a resource id", () => {
  it("shows the target on its own", () => {
    renderWithProviders(<AuditTargetCell target="order" />)

    expect(screen.getByText("order")).toBeInTheDocument()
  })

  it("adds no parenthesised id", () => {
    const { container } = renderWithProviders(<AuditTargetCell target="order" />)

    expect(container.textContent).toBe("order")
  })

  it("adds no tooltip, because there is nothing the truncation could hide", () => {
    renderWithProviders(<AuditTargetCell target="order" />)

    expect(screen.getByText("order")).not.toHaveAttribute("title")
  })
})

describe("AuditTargetCell with a resource id", () => {
  it("shows the id in parentheses beside the target", () => {
    const { container } = renderWithProviders(<AuditTargetCell resourceId="ord_42" target="order" />)

    expect(container.textContent).toBe("order (ord_42)")
  })

  it("titles the cell with the formatted target, so truncation stays readable on hover", () => {
    renderWithProviders(<AuditTargetCell resourceId="ord_42" target="order" />)

    expect(screen.getByTitle(formatAdminAuditTarget("order", "ord_42"))).toBeInTheDocument()
  })

  it("renders the id in a monospace face, since it is machine data", () => {
    renderWithProviders(<AuditTargetCell resourceId="ord_42" target="order" />)

    expect(screen.getByText("(ord_42)")).toHaveClass("font-mono")
  })

  it("collapses a resource id that merely repeats the target", () => {
    const { container } = renderWithProviders(<AuditTargetCell resourceId="settings" target="settings" />)

    expect(container.textContent).toBe("settings")
    expect(screen.getByText("settings")).not.toHaveAttribute("title")
  })
})
