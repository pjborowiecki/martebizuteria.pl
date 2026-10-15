import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  AUDIT_STAT_CARDS,
  type AuditStatCardConfig,
  type AuditStatKey,
} from "~/src/presentation/components/custom/pages/admin/audit/audit-stats.config"
import { AuditStatCard } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-stat-card"

const configFor = (key: AuditStatKey): AuditStatCardConfig => AUDIT_STAT_CARDS.find((card) => card.key === key)!

const renderCard = (props: Partial<Parameters<typeof AuditStatCard>[0]> & { readonly key?: AuditStatKey } = {}) => {
  const onFilter = vi.fn<() => void>()
  const { key = "total", ...overrides } = props
  renderWithProviders(
    <AuditStatCard config={configFor(key)} displayValue={0} isActive={false} onFilter={onFilter} valuesPending={false} {...overrides} />,
  )

  return { button: screen.getByRole("button"), onFilter }
}

afterEach(() => {
  cleanup()
})

describe("AuditStatCard rendering", () => {
  it.each([
    ["total", "Total events"],
    ["today", "Today"],
    ["warnings", "Warnings"],
    ["errors", "Errors"],
  ] as const)("labels the %s card", (key, label) => {
    renderCard({ key })

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("groups the event count for the locale", () => {
    renderCard({ displayValue: 12_345 })

    expect(screen.getByText("12,345")).toBeInTheDocument()
  })

  it("cuts a long event count short beside its icon instead of running under it", () => {
    renderCard({ displayValue: 1_234_567_890 })

    expect(screen.getByText("1,234,567,890")).toHaveClass("min-w-0", "truncate")
  })

  it("shows zero when no count was supplied", () => {
    renderCard({ displayValue: undefined, key: "errors" })

    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("hides the count behind a placeholder while loading", () => {
    renderCard({ displayValue: 12_345, valuesPending: true })

    expect(screen.queryByText("12,345")).not.toBeInTheDocument()
  })

  it("shows the caption it was given", () => {
    renderCard({ caption: "12% of total", displayValue: 12, key: "warnings" })

    expect(screen.getByText("12% of total")).toBeInTheDocument()
  })
})

describe("AuditStatCard filtering", () => {
  it("shows itself pressed while its filter is the one applied", () => {
    expect(renderCard({ isActive: true }).button).toHaveAttribute("aria-pressed", "true")
  })

  it("shows itself released while another filter is applied", () => {
    expect(renderCard({ isActive: false }).button).toHaveAttribute("aria-pressed", "false")
  })

  it("filters when pressed", () => {
    const { button, onFilter } = renderCard({ key: "warnings" })

    fireEvent.click(button)

    expect(onFilter).toHaveBeenCalledOnce()
  })

  it("still filters while its count is loading, marking only the count as busy", () => {
    const { button, onFilter } = renderCard({ key: "today", valuesPending: true })

    expect(button).toBeEnabled()
    expect(button).toHaveAttribute("aria-busy", "true")

    fireEvent.click(button)

    expect(onFilter).toHaveBeenCalledOnce()
  })
})
