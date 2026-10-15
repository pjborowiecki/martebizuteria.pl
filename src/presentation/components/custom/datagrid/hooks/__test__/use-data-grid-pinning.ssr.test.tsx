import { type JSX } from "react"
import { renderToString } from "react-dom/server"

import { describe, expect, it } from "vite-plus/test"

import { useDataGridPinning } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-pinning"

const CrowdedGrid = (): JSX.Element => {
  const { pinsColumns } = useDataGridPinning({
    columnSizing: {},
    layoutColumns: [],
    tableClientWidth: 200,
    tableLayout: undefined,
    tableWidth: 900,
  })

  return <output>{pinsColumns ? "pinned" : "scrolling"}</output>
}

describe("server-rendered grid pinning", () => {
  it("renders the desktop pinned columns on the server, where no screen can be measured", () => {
    expect(renderToString(<CrowdedGrid />)).toBe("<output>pinned</output>")
  })
})
