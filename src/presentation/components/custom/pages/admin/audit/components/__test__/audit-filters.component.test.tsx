import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type { AuditLogCategoryFilter, AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"

interface AuditFilterPatch {
  readonly category?: AuditLogCategoryFilter | undefined
  readonly severity?: AuditLogSeverity | undefined
}

interface AuditFilterContext {
  readonly activeCategoryFilter: AuditLogCategoryFilter
  readonly activeSeverityFilter: AuditLogSeverity | undefined
  readonly applyAuditFilter: (patch?: AuditFilterPatch) => void
}

const contextRef = vi.hoisted(() => {
  const applyAuditFilter = vi.fn<(patch?: AuditFilterPatch) => void>()
  const initial: AuditFilterContext = {
    activeCategoryFilter: "all",
    activeSeverityFilter: undefined,
    applyAuditFilter,
  }

  return { applyAuditFilter, current: initial }
})

vi.mock("~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid", () => ({
  useAuditDataGridContext: () => contextRef.current,
}))

import { AuditCategoryFilter, AuditSeverityFilter } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-filters"

const setContext = (patch: Partial<AuditFilterContext>): void => {
  contextRef.current = { ...contextRef.current, ...patch }
}

const trigger = (name: string): HTMLElement => screen.getByRole("combobox", { name })

const pick = async (name: string, option: string): Promise<void> => {
  await userEvent.click(trigger(name))
  const options = await screen.findAllByRole("option")
  const target = options.find((item) => item.textContent === option)
  if (target === undefined) {
    throw new Error(`No option labelled ${option}`)
  }
  await userEvent.click(target)
}

beforeEach(() => {
  vi.clearAllMocks()
  contextRef.current = {
    activeCategoryFilter: "all",
    activeSeverityFilter: undefined,
    applyAuditFilter: contextRef.applyAuditFilter,
  }
})

afterEach(() => {
  cleanup()
})

describe("AuditCategoryFilter", () => {
  it("starts with every category included", () => {
    renderWithProviders(<AuditCategoryFilter />)

    expect(trigger("Filter by category")).toHaveTextContent("All categories")
  })

  it("offers the all option ahead of every audited category", async () => {
    renderWithProviders(<AuditCategoryFilter />)

    await userEvent.click(trigger("Filter by category"))
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual([
      "All categories",
      "Orders",
      "Email",
      "Customers",
      "Catalog",
      "Settings",
      "Auth",
    ])
  })

  it("narrows the log to a single category", async () => {
    renderWithProviders(<AuditCategoryFilter />)
    await pick("Filter by category", "Catalog")

    expect(contextRef.applyAuditFilter).toHaveBeenCalledWith({ category: "catalog" })
  })

  it("asks for every category again", async () => {
    setContext({ activeCategoryFilter: "catalog" })
    renderWithProviders(<AuditCategoryFilter />)
    await pick("Filter by category", "All categories")

    expect(contextRef.applyAuditFilter).toHaveBeenCalledWith({ category: "all" })
  })

  it("shows the category name rather than the all label once one is active", () => {
    setContext({ activeCategoryFilter: "auth" })
    renderWithProviders(<AuditCategoryFilter />)

    expect(trigger("Filter by category")).toHaveTextContent("Auth")
  })
})

describe("AuditSeverityFilter", () => {
  it("starts with every status included", () => {
    renderWithProviders(<AuditSeverityFilter />)

    expect(trigger("Filter by status")).toHaveTextContent("All statuses")
  })

  it("offers the all option ahead of every severity the log records", async () => {
    renderWithProviders(<AuditSeverityFilter />)

    await userEvent.click(trigger("Filter by status"))
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["All statuses", "Info", "Success", "Warning", "Error"])
  })

  it("narrows the log to failures only", async () => {
    renderWithProviders(<AuditSeverityFilter />)
    await pick("Filter by status", "Error")

    expect(contextRef.applyAuditFilter).toHaveBeenCalledWith({ severity: "error" })
  })

  it("drops the severity filter instead of sending the all sentinel to the server", async () => {
    setContext({ activeSeverityFilter: "error" })
    renderWithProviders(<AuditSeverityFilter />)
    await pick("Filter by status", "All statuses")

    expect(contextRef.applyAuditFilter).toHaveBeenCalledWith({ severity: undefined })
  })

  it("shows the active severity on the trigger", () => {
    setContext({ activeSeverityFilter: "warning" })
    renderWithProviders(<AuditSeverityFilter />)

    expect(trigger("Filter by status")).toHaveTextContent("Warning")
  })
})
