import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  consumeDataGridRowClickSuppression,
  suppressDataGridRowClickAfterDialogDismiss,
  suppressNextDataGridRowClick,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"

const TEST_CLOCK_GAP_MS = 60_000

let clockMs = new Date("2026-01-01T00:00:00.000Z").getTime()

describe("data grid row click suppression", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clockMs += TEST_CLOCK_GAP_MS
    vi.setSystemTime(clockMs)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("reports no suppression until something asks for it", () => {
    expect(consumeDataGridRowClickSuppression()).toBe(false)
  })

  it("suppresses the row click for 300ms by default", () => {
    suppressNextDataGridRowClick()

    expect(consumeDataGridRowClickSuppression()).toBe(true)
    vi.advanceTimersByTime(299)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(consumeDataGridRowClickSuppression()).toBe(false)
  })

  it("honours an explicit suppression window", () => {
    suppressNextDataGridRowClick(50)

    vi.advanceTimersByTime(49)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(consumeDataGridRowClickSuppression()).toBe(false)
  })

  it("suppresses for 500ms after a dialog dismissal", () => {
    suppressDataGridRowClickAfterDialogDismiss()

    vi.advanceTimersByTime(499)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(consumeDataGridRowClickSuppression()).toBe(false)
  })

  it("never shortens an already longer suppression window", () => {
    suppressDataGridRowClickAfterDialogDismiss()
    suppressNextDataGridRowClick(10)

    vi.advanceTimersByTime(400)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })

  it("extends the window when a later request reaches further", () => {
    suppressNextDataGridRowClick(10)
    suppressDataGridRowClickAfterDialogDismiss()

    vi.advanceTimersByTime(400)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })
})
