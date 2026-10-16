import { type JSX } from "react"

import { createColumnHelper, flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import {
  CATALOG_LOCALIZED_TITLE_COLUMN_VISIBILITY,
  buildCatalogLocalizedTitleColumns,
  catalogLocalizedTitleColumnId,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-localized-title-columns"

interface TitledRow {
  readonly id: string
  readonly titles: Readonly<Record<SupportedLocale, string>>
}

const ROW: TitledRow = { id: "ring", titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" } }

const columnHelper = createColumnHelper<DataGridFeatures, TitledRow>()

const COLUMNS = columnHelper.columns([...buildCatalogLocalizedTitleColumns(columnHelper, (language) => `Title (${language})`)])

const LocalizedTitles = (): JSX.Element => {
  const table = useTable<DataGridFeatures, TitledRow>({
    columns: COLUMNS,
    data: [ROW],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })
  const [row] = table.getRowModel().rows

  return (
    <div>
      {row?.getVisibleCells().map((cell) => (
        <span key={cell.id} data-testid={cell.column.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </span>
      ))}
    </div>
  )
}

afterEach(cleanup)

describe("buildCatalogLocalizedTitleColumns", () => {
  it("adds one title column per shop language, named by its language code", () => {
    expect(COLUMNS.map((column) => [column.id, column.header])).toStrictEqual([
      ["title-pl-PL", "Title (PL)"],
      ["title-en-US", "Title (EN)"],
    ])
  })

  it("shows and exports the title in the language of its column", () => {
    renderWithProviders(<LocalizedTitles />)

    expect(screen.getByTestId("title-pl-PL")).toHaveTextContent("Srebrny pierścionek")
    expect(screen.getByTestId("title-en-US")).toHaveTextContent("Silver ring")
    expect(COLUMNS.map((column) => column.meta?.exportValue?.(ROW))).toStrictEqual(["Srebrny pierścionek", "Silver ring"])
  })

  it("keeps every language column hidden until the admin shows it", () => {
    expect(CATALOG_LOCALIZED_TITLE_COLUMN_VISIBILITY).toStrictEqual({
      [catalogLocalizedTitleColumnId("en-US")]: false,
      [catalogLocalizedTitleColumnId("pl-PL")]: false,
    })
  })
})
