import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const UNKNOWN_VALUE = "a-value-the-log-does-not-use"

const contextRef = vi.hoisted(() => ({
  activeCategoryFilter: "all",
  activeSeverityFilter: undefined as string | undefined,
  applyAuditFilter: vi.fn<(patch?: { category?: string; severity?: string }) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid", () => ({
  useAuditDataGridContext: () => contextRef,
}))
vi.mock("~/src/presentation/components/shadcn/select", () => ({
  Select: ({ children, onValueChange }: Readonly<{ children: ReactNode; onValueChange: (value: string | null) => void }>): JSX.Element => (
    <div>
      <button
        onClick={() => {
          onValueChange(UNKNOWN_VALUE)
        }}
        type="button"
      >
        send unknown value
      </button>
      <button
        onClick={() => {
          onValueChange(null)
        }}
        type="button"
      >
        send no value
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  SelectItem: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  SelectTrigger: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  SelectValue: (): null => null,
}))

import { AuditCategoryFilter, AuditSeverityFilter } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-filters"

const press = async (name: string): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name }))
}

beforeEach(() => {
  contextRef.activeCategoryFilter = "all"
  contextRef.activeSeverityFilter = undefined
  contextRef.applyAuditFilter.mockClear()
})

afterEach(cleanup)

describe("AuditCategoryFilter given a value it cannot recognise", () => {
  it("leaves the log filter untouched for a category name it does not audit", async () => {
    renderWithProviders(<AuditCategoryFilter />)

    await press("send unknown value")

    expect(contextRef.applyAuditFilter).not.toHaveBeenCalled()
  })

  it("leaves the log filter untouched when the picker reports no value at all", async () => {
    renderWithProviders(<AuditCategoryFilter />)

    await press("send no value")

    expect(contextRef.applyAuditFilter).not.toHaveBeenCalled()
  })
})

describe("AuditSeverityFilter given a value it cannot recognise", () => {
  it("leaves the log filter untouched for a severity it does not record", async () => {
    renderWithProviders(<AuditSeverityFilter />)

    await press("send unknown value")

    expect(contextRef.applyAuditFilter).not.toHaveBeenCalled()
  })

  it("leaves the log filter untouched when the picker reports no value at all", async () => {
    renderWithProviders(<AuditSeverityFilter />)

    await press("send no value")

    expect(contextRef.applyAuditFilter).not.toHaveBeenCalled()
  })
})
