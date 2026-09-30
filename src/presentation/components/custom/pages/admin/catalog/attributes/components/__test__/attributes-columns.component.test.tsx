import { type JSX } from "react"

import { flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-reorder-cell", () => ({
  AttributeReorderCell: ({ id }: Readonly<{ id: string }>) => <span>{`drag ${id}`}</span>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-row-actions", () => ({
  AttributesRowActions: () => <span>row actions</span>,
}))

import { useAttributeColumns } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-columns"

type AttributeRow = ProductAttribute["adminListItem"]

const CREATED_AT = new Date("2026-01-15T10:00:00.000Z")

const attribute = (overrides: Partial<AttributeRow> = {}): AttributeRow => ({
  allowedValues: [
    { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" },
    { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
  ],
  createdAt: CREATED_AT,
  handle: "material",
  id: "attribute-1",
  productCount: 12,
  rank: 1,
  titles: { "en-US": "Material", "pl-PL": "Materiał" },
  type: "select",
  unit: "g",
  updatedAt: new Date("2026-02-20T10:00:00.000Z"),
  ...overrides,
})

const ColumnsProbe = ({ row }: Readonly<{ row: AttributeRow }>): JSX.Element => {
  const columns = useAttributeColumns()
  const table = useTable<DataGridFeatures, AttributeRow>({
    columns,
    data: [row],
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  const [headerGroup] = table.getHeaderGroups()
  const [tableRow] = table.getRowModel().rows

  return (
    <div>
      <div>
        {headerGroup?.headers.map((header) => (
          <span key={header.id} data-testid={`head-${header.column.id}`}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
        ))}
      </div>
      <div>
        {tableRow?.getVisibleCells().map((visibleCell) => (
          <span key={visibleCell.id} data-testid={`cell-${visibleCell.column.id}`}>
            {flexRender(visibleCell.column.columnDef.cell, visibleCell.getContext())}
          </span>
        ))}
      </div>
    </div>
  )
}

const RecordIdProbe = ({ row }: Readonly<{ row: AttributeRow }>): JSX.Element => {
  const columns = useAttributeColumns()
  const table = useTable<DataGridFeatures, AttributeRow>({
    columns,
    data: [row],
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  const [tableRow] = table.getRowModel().rows

  return <p data-testid="record-id-value">{tableRow?.getValue<string>("recordId")}</p>
}

const renderColumns = (overrides: Partial<AttributeRow> = {}): void => {
  renderWithProviders(<ColumnsProbe row={attribute(overrides)} />)
}

const cell = (id: string): HTMLElement => screen.getByTestId(`cell-${id}`)

afterEach(() => {
  cleanup()
})

describe("useAttributeColumns headers", () => {
  it("translates the attribute headers", () => {
    renderColumns()

    expect(screen.getByTestId("head-title")).toHaveTextContent("Attribute")
    expect(screen.getByTestId("head-type")).toHaveTextContent("Type")
    expect(screen.getByTestId("head-allowedValues")).toHaveTextContent("Allowed values")
  })

  it("translates the timestamp headers", () => {
    renderColumns()

    expect(screen.getByTestId("head-createdAt")).toHaveTextContent("Created at")
    expect(screen.getByTestId("head-editedAt")).toHaveTextContent("Last edited")
  })
})

describe("useAttributeColumns cells", () => {
  it("renders the localized title with its handle", () => {
    renderColumns()

    expect(cell("title")).toHaveTextContent("Material")
    expect(cell("title")).toHaveTextContent("material")
  })

  it("translates the attribute type", () => {
    renderColumns()

    expect(cell("type")).toHaveTextContent("Single choice")
  })

  it("translates a boolean attribute type", () => {
    renderColumns({ type: "boolean" })

    expect(cell("type")).toHaveTextContent("Yes / No")
  })

  it("renders the unit as written", () => {
    renderColumns()

    expect(cell("unit")).toHaveTextContent("g")
  })

  it("falls back to a dash for a missing unit", () => {
    renderColumns({ unit: null })

    expect(cell("unit")).toHaveTextContent("—")
  })

  it("falls back to a dash for an empty unit", () => {
    renderColumns({ unit: "" })

    expect(cell("unit")).toHaveTextContent("—")
  })

  it("joins the localized allowed value labels", () => {
    renderColumns()

    expect(cell("allowedValues")).toHaveTextContent("Gold, Silver")
  })

  it("shows a dash for a type that has no allowed values", () => {
    renderColumns({ type: "text" })

    expect(cell("allowedValues")).toHaveTextContent("—")
  })

  it("renders the product count", () => {
    renderColumns()

    expect(cell("productCount")).toHaveTextContent("12")
  })

  it("formats both timestamps", () => {
    renderColumns()

    expect(cell("createdAt")).toHaveTextContent("Jan 15, 2026")
    expect(cell("editedAt")).toHaveTextContent("Feb 20, 2026")
  })

  it("renders the drag handle for the row it belongs to", () => {
    renderColumns()

    expect(cell("drag")).toHaveTextContent("drag attribute-1")
  })

  it("renders the row actions in their own column", () => {
    renderColumns()

    expect(cell("actions")).toHaveTextContent("row actions")
  })
})

describe("useAttributeColumns record id column", () => {
  it("sorts and filters the record id column on the row id itself", () => {
    renderWithProviders(<RecordIdProbe row={attribute()} />)

    expect(screen.getByTestId("record-id-value")).toHaveTextContent("attribute-1")
  })
})
