import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import { useAuditDateTimeFilter } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-datetime-filter"

const queryClient = new QueryClient()

const router = createTestRouter()

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders queryClient={queryClient} router={router}>
    {children}
  </TestProviders>
)

const renderFilter = (activeDateFilter: Parameters<typeof useAuditDateTimeFilter>[0]["activeDateFilter"]) => {
  const applyAuditFilter = vi.fn(() => {})
  const hook = renderHook(() => useAuditDateTimeFilter({ activeDateFilter, applyAuditFilter }), { wrapper })

  return { applyAuditFilter, ...hook }
}

afterEach(() => {
  cleanup()
})

describe("useAuditDateTimeFilter", () => {
  it("starts closed with an empty invalid draft and the idle trigger label", () => {
    const { result } = renderFilter(undefined)

    expect(result.current.open).toBe(false)
    expect(result.current.isDraftValid).toBe(false)
    expect(result.current.triggerLabel).toBe("Filter by date range")
  })

  it("seeds the draft from an active single date filter", () => {
    const { result } = renderFilter({ date: "2024-05-09T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    expect(result.current.draft.date).toBe("2024-05-09")
    expect(result.current.draft.time).toBe("08:30")
    expect(result.current.isDraftValid).toBe(true)
  })

  it("renders the operator symbol in the trigger label of an active filter", () => {
    const { result } = renderFilter({ date: "2024-05-09T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER })

    expect(result.current.triggerLabel.startsWith("> ")).toBe(true)
  })

  it("renders a range trigger label for a between filter", () => {
    const { result } = renderFilter({
      endDate: "2024-05-10T23:59",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-05-09T00:00",
    })

    expect(result.current.triggerLabel).toContain("–")
  })

  it("offers every supported operator with translated labels", () => {
    const { result } = renderFilter(undefined)

    expect(result.current.operatorOptions).toStrictEqual([
      { label: "At", value: "on" },
      { label: "Before", value: "before" },
      { label: "After", value: "after" },
      { label: "Date range", value: "between" },
    ])
  })

  it("translates the popover labels", () => {
    const { result } = renderFilter(undefined)

    expect(result.current.labels.apply).toBe("Apply")
    expect(result.current.labels.today).toBe("Today")
    expect(result.current.labels.placeholder).toBe("Select date")
  })

  it("fills in default times when switching to the between operator", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleOperatorChange(DATE_COLUMN_FILTER_OPERATOR.BETWEEN)
    })

    expect(result.current.draft.operator).toBe(DATE_COLUMN_FILTER_OPERATOR.BETWEEN)
    expect(result.current.draft.startTime).toBe("00:00")
    expect(result.current.draft.endTime).toBe("23:59")
  })

  it("fills in a default time when switching to a single date operator", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleOperatorChange(DATE_COLUMN_FILTER_OPERATOR.BEFORE)
    })

    expect(result.current.draft.operator).toBe(DATE_COLUMN_FILTER_OPERATOR.BEFORE)
    expect(result.current.draft.time).toBe("00:00")
  })

  it("ignores an unknown operator", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleOperatorChange("sometime")
    })
    act(() => {
      result.current.handleOperatorChange(null)
    })

    expect(result.current.draft.operator).toBe(DATE_COLUMN_FILTER_OPERATOR.ON)
  })

  it("defaults the time when a date is picked", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleDateChange("2024-05-09")
    })

    expect(result.current.draft.date).toBe("2024-05-09")
    expect(result.current.draft.time).toBe("00:00")
    expect(result.current.isDraftValid).toBe(true)
  })

  it("keeps an explicitly chosen time", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleDateChange("2024-05-09")
    })
    act(() => {
      result.current.handleTimeChange("18:45")
    })

    expect(result.current.draft.time).toBe("18:45")
  })
})

describe("useAuditDateTimeFilter validation and applying", () => {
  it("rejects a range whose end is before its start", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleOperatorChange(DATE_COLUMN_FILTER_OPERATOR.BETWEEN)
    })
    act(() => {
      result.current.handleStartDateChange("2024-05-10")
      result.current.handleEndDateChange("2024-05-09")
    })

    expect(result.current.isDraftValid).toBe(false)
  })

  it("accepts a range whose end is after its start", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleOperatorChange(DATE_COLUMN_FILTER_OPERATOR.BETWEEN)
    })
    act(() => {
      result.current.handleStartDateChange("2024-05-09")
      result.current.handleEndDateChange("2024-05-10")
    })

    expect(result.current.isDraftValid).toBe(true)
  })

  it("does not apply an invalid draft", () => {
    const { applyAuditFilter, result } = renderFilter(undefined)

    act(() => {
      result.current.handleApply()
    })

    expect(applyAuditFilter).not.toHaveBeenCalled()
  })

  it("applies a valid draft as a createdAt filter and closes", () => {
    const { applyAuditFilter, result } = renderFilter(undefined)

    act(() => {
      result.current.handleOpenChange(true)
    })
    act(() => {
      result.current.handleDateChange("2024-05-09")
    })
    act(() => {
      result.current.handleTimeChange("09:15")
    })
    act(() => {
      result.current.handleApply()
    })

    expect(applyAuditFilter).toHaveBeenCalledWith({
      createdAt: { date: "2024-05-09T09:15", operator: DATE_COLUMN_FILTER_OPERATOR.ON },
    })
    expect(result.current.open).toBe(false)
  })

  it("applies a valid range with both bounds", () => {
    const { applyAuditFilter, result } = renderFilter(undefined)

    act(() => {
      result.current.handleOperatorChange(DATE_COLUMN_FILTER_OPERATOR.BETWEEN)
    })
    act(() => {
      result.current.handleStartDateChange("2024-05-09")
      result.current.handleEndDateChange("2024-05-10")
    })
    act(() => {
      result.current.handleStartTimeChange("08:00")
      result.current.handleEndTimeChange("20:00")
    })
    act(() => {
      result.current.handleApply()
    })

    expect(applyAuditFilter).toHaveBeenCalledWith({
      createdAt: {
        endDate: "2024-05-10T20:00",
        operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
        startDate: "2024-05-09T08:00",
      },
    })
  })

  it("clears the filter and the draft", () => {
    const { applyAuditFilter, result } = renderFilter({ date: "2024-05-09T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.ON })

    act(() => {
      result.current.handleClear()
    })

    expect(applyAuditFilter).toHaveBeenCalledWith({ createdAt: undefined })
    expect(result.current.draft.date).toBe("")
    expect(result.current.isDraftValid).toBe(false)
    expect(result.current.open).toBe(false)
  })

  it("exposes today as an iso date", () => {
    const { result } = renderFilter(undefined)

    expect(result.current.todayIso).toMatch(/^\d{4}-\d{2}-\d{2}$/u)
  })
})

describe("useAuditDateTimeFilter retaining draft times", () => {
  it("preserves chosen times when switching operators and selecting new dates", () => {
    const { result } = renderFilter(undefined)

    act(() => {
      result.current.handleTimeChange("09:15")
      result.current.handleStartTimeChange("08:30")
      result.current.handleEndTimeChange("19:45")
    })
    act(() => {
      result.current.handleOperatorChange(DATE_COLUMN_FILTER_OPERATOR.BETWEEN)
      result.current.handleStartDateChange("2024-05-09")
      result.current.handleEndDateChange("2024-05-10")
    })

    expect(result.current.draft).toMatchObject({ endTime: "19:45", startTime: "08:30" })

    act(() => {
      result.current.handleOperatorChange(DATE_COLUMN_FILTER_OPERATOR.AFTER)
      result.current.handleDateChange("2024-05-11")
    })

    expect(result.current.draft).toMatchObject({ date: "2024-05-11", time: "09:15" })
    expect(result.current.isDraftValid).toBe(true)
  })

  it("restores full-day boundaries when dates are picked after clearing range times", () => {
    const { result } = renderFilter({
      endDate: "2024-05-10T19:45",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-05-09T08:30",
    })

    act(() => {
      result.current.handleStartTimeChange("")
      result.current.handleEndTimeChange("")
    })
    expect(result.current.isDraftValid).toBe(false)

    act(() => {
      result.current.handleStartDateChange("2024-06-01")
      result.current.handleEndDateChange("2024-06-02")
    })

    expect(result.current.draft).toMatchObject({ endTime: "23:59", startTime: "00:00" })
    expect(result.current.isDraftValid).toBe(true)
  })
})
