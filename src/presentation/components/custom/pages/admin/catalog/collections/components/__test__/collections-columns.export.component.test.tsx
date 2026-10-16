import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

vi.mock("~/src/presentation/components/custom/image", () => ({ Image: (): JSX.Element => <span /> }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collection-reorder-cell", () => ({
  CollectionReorderCell: (): JSX.Element => <span />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-row-actions", () => ({
  CollectionsRowActions: (): JSX.Element => <span />,
}))

import { useCollectionColumns } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-columns"

import { type CollectionRow, collectionRow } from "./collections-grid-harness"

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exportValues = (overrides: Partial<CollectionRow>): Record<string, string | undefined> => {
  const { result } = renderHook(() => useCollectionColumns(), { wrapper: Wrapper })
  const row = collectionRow(overrides)

  return Object.fromEntries(
    result.current.flatMap((column): [string, string | undefined][] =>
      column.id === undefined ? [] : [[column.id, column.meta?.exportValue?.(row)]],
    ),
  )
}

describe("useCollectionColumns export values", () => {
  it("exports every data column as the text its cell shows", () => {
    const values = exportValues({
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      descriptions: { "en-US": "The freshest pieces", "pl-PL": "Najnowsze wzory" },
      handle: "new-arrivals",
      id: "collection-1",
      productCount: 4,
      status: "active",
      titles: { "en-US": "New arrivals", "pl-PL": "Nowości" },
      updatedAt: new Date("2026-02-20T10:00:00.000Z"),
    })

    expect(values).toStrictEqual({
      actions: undefined,
      createdAt: "Jan 15, 2026",
      description: "The freshest pieces",
      drag: undefined,
      editedAt: "Feb 20, 2026",
      image: undefined,
      productCount: "4",
      recordId: "collection-1",
      select: undefined,
      status: "Active",
      title: "New arrivals (/new-arrivals)",
      "title-en-US": "New arrivals",
      "title-pl-PL": "Nowości",
    })
  })

  it("names a draft collection", () => {
    expect(exportValues({ status: "draft" })).toMatchObject({ status: "Draft" })
  })
})
