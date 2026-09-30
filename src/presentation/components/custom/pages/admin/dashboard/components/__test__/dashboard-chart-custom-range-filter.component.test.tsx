import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DashboardChartCustomRangeFilter } from "~/src/presentation/components/custom/pages/admin/dashboard/components/dashboard-chart-custom-range-filter"
import { type DashboardCustomChartRange } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"

afterEach(cleanup)

const RANGE: DashboardCustomChartRange = { endDate: "2026-02-10", startDate: "2026-02-01" }

const renderFilter = (activeRange: DashboardCustomChartRange | undefined, isActive: boolean) => {
  const onApply = vi.fn<(range: DashboardCustomChartRange) => void>()
  const onClear = vi.fn<() => void>()

  renderWithProviders(<DashboardChartCustomRangeFilter activeRange={activeRange} isActive={isActive} onApply={onApply} onClear={onClear} />)

  return { onApply, onClear }
}

describe("DashboardChartCustomRangeFilter trigger", () => {
  it("reads Custom while no range is chosen", () => {
    renderFilter(undefined, false)

    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument()
  })

  it("reads Custom while a range exists but the chart is on a preset", () => {
    renderFilter(RANGE, false)

    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument()
  })

  it("shows the formatted range once the chart is on it", () => {
    renderFilter(RANGE, true)

    expect(screen.getByRole("button", { name: "Feb 1, 2026 – Feb 10, 2026" })).toBeInTheDocument()
  })

  it("marks the active trigger with the selected background", () => {
    renderFilter(RANGE, true)

    expect(screen.getByRole("button", { name: "Feb 1, 2026 – Feb 10, 2026" })).toHaveClass("bg-secondary")
  })

  it("leaves an inactive trigger unhighlighted", () => {
    renderFilter(RANGE, false)

    expect(screen.getByRole("button", { name: "Custom" })).not.toHaveClass("bg-secondary")
  })
})

describe("DashboardChartCustomRangeFilter popover", () => {
  it("stays closed until the trigger is pressed", () => {
    renderFilter(undefined, false)

    expect(screen.queryByText("Date range")).not.toBeInTheDocument()
  })

  it("offers a start and end date field once opened", async () => {
    renderFilter(undefined, false)

    await userEvent.click(screen.getByRole("button", { name: "Custom" }))

    expect(await screen.findByText("Date range")).toBeInTheDocument()
    expect(screen.getByLabelText("Start date")).toBeInTheDocument()
    expect(screen.getByLabelText("End date")).toBeInTheDocument()
  })

  it("cannot apply an empty draft range", async () => {
    renderFilter(undefined, false)

    await userEvent.click(screen.getByRole("button", { name: "Custom" }))

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDisabled()
  })

  it("offers no clear action while no range is applied", async () => {
    renderFilter(undefined, false)

    await userEvent.click(screen.getByRole("button", { name: "Custom" }))
    await screen.findByText("Date range")

    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument()
  })

  it("seeds the draft from the applied range so it can be re-applied", async () => {
    const { onApply } = renderFilter(RANGE, true)

    await userEvent.click(screen.getByRole("button", { name: "Feb 1, 2026 – Feb 10, 2026" }))
    const apply = await screen.findByRole("button", { name: "Apply" })

    expect(apply).toBeEnabled()

    await userEvent.click(apply)

    expect(onApply).toHaveBeenCalledExactlyOnceWith({ endDate: "2026-02-10", startDate: "2026-02-01" })
  })

  it("closes itself after applying", async () => {
    renderFilter(RANGE, true)

    await userEvent.click(screen.getByRole("button", { name: "Feb 1, 2026 – Feb 10, 2026" }))
    await userEvent.click(await screen.findByRole("button", { name: "Apply" }))

    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument()
  })

  it("clears the applied range and closes", async () => {
    const { onApply, onClear } = renderFilter(RANGE, true)

    await userEvent.click(screen.getByRole("button", { name: "Feb 1, 2026 – Feb 10, 2026" }))
    await userEvent.click(await screen.findByRole("button", { name: "Clear" }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument()
  })
})
