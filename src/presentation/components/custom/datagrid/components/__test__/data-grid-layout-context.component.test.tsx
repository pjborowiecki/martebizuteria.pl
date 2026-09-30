import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  DataGridLayoutProvider,
  useDataGridLayout,
} from "~/src/presentation/components/custom/datagrid/components/data-grid-layout-context"
import { type DataGridTableLayout } from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"

const LayoutProbe = () => {
  const { tableClientWidth, tableLayout, tableWidth } = useDataGridLayout()

  return <output>{`${tableWidth}/${tableClientWidth}/${tableLayout === undefined ? "none" : String(tableLayout.tableWidth)}`}</output>
}

const layout: DataGridTableLayout = {
  fillColumnIsUserSized: true,
  fillColumnWidth: 260,
  slackAbsorberColumnWidth: 120,
  tableWidth: 380,
}

describe("useDataGridLayout", () => {
  afterEach(() => {
    cleanup()
  })

  it("falls back to a zero width layout when no provider wraps the grid", () => {
    renderWithProviders(<LayoutProbe />)

    expect(screen.getByRole("status")).toHaveTextContent("0/0/none")
  })

  it("exposes the measured widths the provider publishes", () => {
    renderWithProviders(
      <DataGridLayoutProvider value={{ tableClientWidth: 900, tableLayout: layout, tableWidth: 1200 }}>
        <LayoutProbe />
      </DataGridLayoutProvider>,
    )

    expect(screen.getByRole("status")).toHaveTextContent("1200/900/380")
  })
})
