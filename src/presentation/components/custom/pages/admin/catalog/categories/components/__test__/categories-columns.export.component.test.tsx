import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

vi.mock("~/src/presentation/components/custom/image", () => ({ Image: (): JSX.Element => <span /> }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/category-reorder-cell", () => ({
  CategoryReorderCell: (): JSX.Element => <span />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-row-actions", () => ({
  CategoriesRowActions: (): JSX.Element => <span />,
}))

import { useCategoryColumns } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-columns"

afterEach(cleanup)

type CategoryRow = ProductCategory["adminListItem"]

const localized = (english: string, polish: string) => ({ "en-US": english, "pl-PL": polish })

const category = (overrides: Partial<CategoryRow> = {}): CategoryRow => ({
  createdAt: new Date("2026-01-15T10:00:00.000Z"),
  descriptions: localized("Rings cast in gold.", "Pierścionki odlane ze złota."),
  handle: "rings",
  id: "category-1",
  image: null,
  metadata: null,
  parentId: "category-0",
  parentTitles: localized("Jewellery", "Biżuteria"),
  productCount: 7,
  rank: 1,
  shortDescriptions: localized("Gold rings", "Złote pierścionki"),
  status: "active",
  subtitles: localized("Every ring", "Każdy pierścionek"),
  titles: localized("Rings", "Pierścionki"),
  updatedAt: new Date("2026-02-20T10:00:00.000Z"),
  ...overrides,
})

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exportValues = (overrides: Partial<CategoryRow> = {}): Record<string, string | undefined> => {
  const { result } = renderHook(() => useCategoryColumns(), { wrapper: Wrapper })
  const row = category(overrides)

  return Object.fromEntries(
    result.current.flatMap((column): [string, string | undefined][] =>
      column.id === undefined ? [] : [[column.id, column.meta?.exportValue?.(row)]],
    ),
  )
}

describe("useCategoryColumns export values", () => {
  it("exports every data column as the text its cell shows", () => {
    expect(exportValues()).toStrictEqual({
      actions: undefined,
      createdAt: "Jan 15, 2026",
      description: "Rings cast in gold.",
      drag: undefined,
      editedAt: "Feb 20, 2026",
      image: undefined,
      parent: "Jewellery",
      productCount: "7",
      recordId: "category-1",
      select: undefined,
      shortDescription: "Gold rings",
      status: "Active",
      subtitle: "Every ring",
      title: "Rings (/rings)",
      "title-en-US": "Rings",
      "title-pl-PL": "Pierścionki",
    })
  })

  it("names a draft and leaves out the parent of a top-level category", () => {
    expect(exportValues({ parentTitles: undefined, status: "draft" })).toMatchObject({ parent: undefined, status: "Draft" })
  })
})
