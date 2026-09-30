import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DATA_GRID_BODY_SCROLL_CLASS, DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"

describe("DataGridShell", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the grid it wraps", () => {
    renderWithProviders(
      <DataGridShell>
        <span>Products table</span>
      </DataGridShell>,
    )

    expect(screen.getByText("Products table")).toBeInTheDocument()
  })

  it("lays the card out as a toolbar, body and pagination grid", () => {
    const { container } = renderWithProviders(
      <DataGridShell>
        <span>Products table</span>
      </DataGridShell>,
    )
    const card = container.firstElementChild

    expect(card?.className).toContain("grid-rows-[auto_minmax(0,1fr)_auto]")
    expect(card?.className).toContain("overflow-hidden")
  })

  it("keeps the card content transparent to the grid so its children become the grid rows", () => {
    const { container } = renderWithProviders(
      <DataGridShell>
        <span>Products table</span>
      </DataGridShell>,
    )

    expect(container.querySelector('[data-slot="card-content"]')?.className).toContain("contents")
  })

  it("exposes a scroll class the body can share", () => {
    expect(DATA_GRID_BODY_SCROLL_CLASS).toBe("min-h-0 overflow-auto")
  })
})
