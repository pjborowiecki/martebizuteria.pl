import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"
import {
  COLLECTIONS_DATA_GRID_KEY,
  collectionsDataGrid,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"

const productsGrid = createDataGrid({ persistenceKey: "admin.catalog.products" })

const CollectionsGridConsumer = () => {
  const { searchPlaceholder } = collectionsDataGrid.useDataGrid()

  return <p>{searchPlaceholder}</p>
}

afterEach(() => {
  cleanup()
})

describe("collectionsDataGrid", () => {
  it("persists its layout under the stable collections key", () => {
    expect(COLLECTIONS_DATA_GRID_KEY).toBe("admin.catalog.collections")
    expect(collectionsDataGrid.persistenceKey).toBe(COLLECTIONS_DATA_GRID_KEY)
  })

  it("does not share a persistence key with another admin grid", () => {
    expect(collectionsDataGrid.persistenceKey).not.toBe(productsGrid.persistenceKey)
  })

  it("exposes the grid slots the collections page composes", () => {
    expect(Object.keys(collectionsDataGrid).toSorted()).toStrictEqual([
      "Body",
      "Pagination",
      "Provider",
      "Toolbar",
      "persistenceKey",
      "useDataGrid",
    ])
  })

  it("refuses to read the grid context outside its own provider", () => {
    expect(() => render(<CollectionsGridConsumer />)).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })
})
