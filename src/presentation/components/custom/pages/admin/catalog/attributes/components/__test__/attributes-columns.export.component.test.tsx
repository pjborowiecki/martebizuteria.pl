import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-reorder-cell", () => ({
  AttributeReorderCell: (): JSX.Element => <span />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-row-actions", () => ({
  AttributesRowActions: (): JSX.Element => <span />,
}))

import { useAttributeColumns } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-columns"

afterEach(cleanup)

type AttributeRow = ProductAttribute["adminListItem"]

const attribute = (overrides: Partial<AttributeRow> = {}): AttributeRow => ({
  allowedValues: [
    { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" },
    { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
  ],
  createdAt: new Date("2026-01-15T10:00:00.000Z"),
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

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exportValues = (overrides: Partial<AttributeRow> = {}): Record<string, string | undefined> => {
  const { result } = renderHook(() => useAttributeColumns(), { wrapper: Wrapper })
  const row = attribute(overrides)

  return Object.fromEntries(
    result.current.flatMap((column): [string, string | undefined][] =>
      column.id === undefined ? [] : [[column.id, column.meta?.exportValue?.(row)]],
    ),
  )
}

describe("useAttributeColumns export values", () => {
  it("exports every data column as the text its cell shows", () => {
    expect(exportValues()).toStrictEqual({
      actions: undefined,
      allowedValues: "Gold, Silver",
      createdAt: "Jan 15, 2026",
      drag: undefined,
      editedAt: "Feb 20, 2026",
      productCount: "12",
      recordId: "attribute-1",
      select: undefined,
      title: "Material (/material)",
      "title-en-US": "Material",
      "title-pl-PL": "Materiał",
      type: "Single choice",
      unit: "g",
    })
  })

  it("leaves out the unit of an attribute measured in nothing", () => {
    expect(exportValues({ unit: null })).toMatchObject({ unit: undefined })
  })
})
