import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"

const queries = vi.hoisted(() => ({
  collections: vi.fn(() => ({ queryFn: () => Promise.resolve([]), queryKey: ["admin", "collections", "list"] })),
  stats: vi.fn(() => ({
    queryFn: () => Promise.resolve({ active: 0, avgProducts: 0, draft: 0, total: 0 }),
    queryKey: ["admin", "collections", "stats"],
  })),
}))

vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({ getAdminCollectionsQuery: queries.collections }))
vi.mock("~/src/modules/product-collection/use-cases/get-collection-stats", () => ({ getCollectionStatsQuery: queries.stats }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-table", async () => {
  const { useCollectionsSheet } =
    await import("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet")

  return {
    CollectionsTableContent: (): JSX.Element => {
      const { mode, open } = useCollectionsSheet()

      return <p>{`${mode}|${String(open)}`}</p>
    },
  }
})

import { Route } from "~/src/routes/admin.catalog.collections.index"

const CollectionsIndexRoute = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the admin collections route renders no component")
  }

  return <Page />
}

afterEach(cleanup)

describe("admin collections index route", () => {
  it("hands a closed sheet to the table below it", () => {
    renderWithProviders(<CollectionsIndexRoute />)

    expect(screen.getByText("closed|false")).toBeInTheDocument()
  })

  it("keeps the list fresh for the shared collection window", () => {
    expect(Route.options.staleTime).toBe(COLLECTION_QUERY_STALE_MS)
  })

  it("never reloads the list on a revisit", () => {
    expect(Route.options.shouldReload).toBe(false)
  })
})
