import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"

import {
  AUDIT_STAT_CARDS,
  type AuditStatCardConfig,
  type AuditStatKey,
} from "~/src/presentation/components/custom/pages/admin/audit/audit-stats.config"
import { AuditStatCard } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-stat-card"

const configFor = (key: AuditStatKey): AuditStatCardConfig => {
  const config = AUDIT_STAT_CARDS.find((card) => card.key === key)
  if (config === undefined) {
    throw new Error(`No audit stat card configured for ${key}`)
  }

  return config
}

const createSeveritySpy = () => vi.fn<(severity?: AuditLogSeverity) => void>()

const createTodaySpy = () => vi.fn<() => void>()

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
    renderWithProviders(<AuditStatCard config={configFor(key)} displayValue={0} valuesPending={false} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("groups the event count for the locale", () => {
    renderWithProviders(<AuditStatCard config={configFor("total")} displayValue={12_345} valuesPending={false} />)

    expect(screen.getByText("12,345")).toBeInTheDocument()
  })

  it("shows zero when no count was supplied", () => {
    renderWithProviders(<AuditStatCard config={configFor("errors")} valuesPending={false} />)

    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("hides the count behind a placeholder while loading", () => {
    renderWithProviders(<AuditStatCard config={configFor("total")} displayValue={12_345} valuesPending />)

    expect(screen.queryByText("12,345")).not.toBeInTheDocument()
  })

  it("shows the caption it was given", () => {
    renderWithProviders(<AuditStatCard caption="12% of total" config={configFor("warnings")} displayValue={12} valuesPending={false} />)

    expect(screen.getByText("12% of total")).toBeInTheDocument()
  })

  it("is not a button without a filter handler", () => {
    renderWithProviders(<AuditStatCard config={configFor("warnings")} displayValue={12} valuesPending={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("does not make the today card pressable from the severity handler alone", () => {
    renderWithProviders(<AuditStatCard config={configFor("today")} displayValue={4} onFilter={createSeveritySpy()} valuesPending={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("AuditStatCard severity filtering", () => {
  it("shows the total card as active when nothing is filtered", () => {
    renderWithProviders(
      <AuditStatCard config={configFor("total")} displayValue={120} onFilter={createSeveritySpy()} valuesPending={false} />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("shows the total card as inactive while a severity is filtered", () => {
    renderWithProviders(
      <AuditStatCard
        activeSeverityFilter="error"
        config={configFor("total")}
        displayValue={120}
        onFilter={createSeveritySpy()}
        valuesPending={false}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("shows the total card as inactive while today is filtered", () => {
    renderWithProviders(
      <AuditStatCard
        activeTodayFilter
        config={configFor("total")}
        displayValue={120}
        onFilter={createSeveritySpy()}
        valuesPending={false}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("clears the severity filter when the total card is pressed", () => {
    const onFilter = createSeveritySpy()
    renderWithProviders(
      <AuditStatCard
        activeSeverityFilter="error"
        config={configFor("total")}
        displayValue={120}
        onFilter={onFilter}
        valuesPending={false}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("applies the warning severity when its card is pressed", () => {
    const onFilter = createSeveritySpy()
    renderWithProviders(<AuditStatCard config={configFor("warnings")} displayValue={12} onFilter={onFilter} valuesPending={false} />)
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith("warning")
  })

  it("applies the error severity when its card is pressed", () => {
    const onFilter = createSeveritySpy()
    renderWithProviders(<AuditStatCard config={configFor("errors")} displayValue={3} onFilter={onFilter} valuesPending={false} />)
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith("error")
  })

  it("clears the severity when the already active card is pressed again", () => {
    const onFilter = createSeveritySpy()
    renderWithProviders(
      <AuditStatCard
        activeSeverityFilter="error"
        config={configFor("errors")}
        displayValue={3}
        onFilter={onFilter}
        valuesPending={false}
      />,
    )
    const button = screen.getByRole("button")

    expect(button).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(button)

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("leaves a severity card inactive when a different severity is filtered", () => {
    renderWithProviders(
      <AuditStatCard
        activeSeverityFilter="warning"
        config={configFor("errors")}
        displayValue={3}
        onFilter={createSeveritySpy()}
        valuesPending={false}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })
})

describe("AuditStatCard today filtering", () => {
  it("becomes pressable once a today handler is supplied", () => {
    renderWithProviders(
      <AuditStatCard config={configFor("today")} displayValue={4} onTodayFilter={createTodaySpy()} valuesPending={false} />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("reflects the today filter being on", () => {
    renderWithProviders(
      <AuditStatCard
        activeTodayFilter
        config={configFor("today")}
        displayValue={4}
        onTodayFilter={createTodaySpy()}
        valuesPending={false}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("toggles the today filter rather than a severity", () => {
    const onFilter = createSeveritySpy()
    const onTodayFilter = createTodaySpy()
    renderWithProviders(
      <AuditStatCard
        config={configFor("today")}
        displayValue={4}
        onFilter={onFilter}
        onTodayFilter={onTodayFilter}
        valuesPending={false}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onTodayFilter).toHaveBeenCalledTimes(1)
    expect(onFilter).not.toHaveBeenCalled()
  })

  it("refuses to filter while the counts are still loading", () => {
    const onTodayFilter = createTodaySpy()
    renderWithProviders(<AuditStatCard config={configFor("today")} displayValue={4} onTodayFilter={onTodayFilter} valuesPending />)
    const button = screen.getByRole("button")

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")

    fireEvent.click(button)

    expect(onTodayFilter).not.toHaveBeenCalled()
  })
})
