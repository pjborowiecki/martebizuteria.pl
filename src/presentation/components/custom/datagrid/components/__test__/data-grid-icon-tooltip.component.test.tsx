import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"

describe("DataGridIconTooltip", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the element it was handed as the trigger", () => {
    renderWithProviders(<DataGridIconTooltip label="Reset columns" trigger={<button type="button">Reset</button>} />)

    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("data-slot", "tooltip-trigger")
  })

  it("keeps the label out of the document until the trigger is hovered", () => {
    renderWithProviders(<DataGridIconTooltip label="Reset columns" trigger={<button type="button">Reset</button>} />)

    expect(screen.queryByText("Reset columns")).toBeNull()
  })

  it("reveals the label once the trigger is focused", async () => {
    renderWithProviders(<DataGridIconTooltip label="Reset columns" trigger={<button type="button">Reset</button>} />)

    await userEvent.tab()

    expect(await screen.findByText("Reset columns")).toBeInTheDocument()
  })
})
