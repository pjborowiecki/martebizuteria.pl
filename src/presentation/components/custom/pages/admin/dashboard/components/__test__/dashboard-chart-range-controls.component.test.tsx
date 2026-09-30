import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DashboardChartRangeControls } from "~/src/presentation/components/custom/pages/admin/dashboard/components/dashboard-chart-range-controls"
import { type DashboardChartRange } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"

afterEach(cleanup)

const PRESET_LABELS = ["Last 7 days", "Last 30 days", "Last year"]

const renderControls = (chartRange: DashboardChartRange) => {
  const onSelectRange = vi.fn<(range: Exclude<DashboardChartRange, "custom">) => void>()

  renderWithProviders(
    <DashboardChartRangeControls
      chartRange={chartRange}
      customRange={undefined}
      onApplyCustomRange={vi.fn<(range: { readonly endDate: string; readonly startDate: string }) => void>()}
      onClearCustomRange={vi.fn<() => void>()}
      onSelectRange={onSelectRange}
    />,
  )

  return onSelectRange
}

describe("DashboardChartRangeControls", () => {
  it("offers the three preset ranges plus the custom trigger", () => {
    renderControls("7d")

    expect(screen.getByRole("button", { name: "Last 7 days" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Last 30 days" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Last year" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument()
  })

  it.each([
    ["7d", "Last 7 days"],
    ["30d", "Last 30 days"],
    ["1y", "Last year"],
  ] as const)("highlights only the %s preset as selected", (chartRange, label) => {
    renderControls(chartRange)

    const highlighted = PRESET_LABELS.filter((name) => screen.getByRole("button", { name }).classList.contains("bg-secondary"))

    expect(highlighted).toStrictEqual([label])
  })

  it("highlights no preset while a custom range is in use", () => {
    renderControls("custom")

    const highlighted = PRESET_LABELS.filter((name) => screen.getByRole("button", { name }).classList.contains("bg-secondary"))

    expect(highlighted).toStrictEqual([])
  })

  it.each([
    ["Last 7 days", "7d"],
    ["Last 30 days", "30d"],
    ["Last year", "1y"],
  ] as const)("reports %s as the %s range", async (label, expected) => {
    const onSelectRange = renderControls("custom")

    await userEvent.click(screen.getByRole("button", { name: label }))

    expect(onSelectRange).toHaveBeenCalledExactlyOnceWith(expected)
  })

  it("renders every control as a plain button so it never submits a form", () => {
    renderControls("7d")

    for (const name of [...PRESET_LABELS, "Custom"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("type", "button")
    }
  })
})
