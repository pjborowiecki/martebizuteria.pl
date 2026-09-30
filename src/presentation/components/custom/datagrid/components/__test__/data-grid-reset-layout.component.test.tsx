import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridResetLayout } from "~/src/presentation/components/custom/datagrid/components/data-grid-reset-layout"

const RESET_LABEL = "Reset table settings to defaults"

describe("DataGridResetLayout", () => {
  afterEach(() => {
    cleanup()
  })

  it("labels the reset control with the translated datagrid message", () => {
    renderWithProviders(<DataGridResetLayout disabled={false} onReset={vi.fn<() => void>()} />)

    expect(screen.getByRole("button", { name: RESET_LABEL })).toBeInTheDocument()
  })

  it("calls back once when the layout can be reset", async () => {
    const onReset = vi.fn<() => void>()
    renderWithProviders(<DataGridResetLayout disabled={false} onReset={onReset} />)

    await userEvent.click(screen.getByRole("button", { name: RESET_LABEL }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it("stays inert while the layout already matches the defaults", async () => {
    const onReset = vi.fn<() => void>()
    renderWithProviders(<DataGridResetLayout disabled onReset={onReset} />)
    const button = screen.getByRole("button", { name: RESET_LABEL })

    expect(button).toBeDisabled()
    await userEvent.click(button)

    expect(onReset).not.toHaveBeenCalled()
  })
})
