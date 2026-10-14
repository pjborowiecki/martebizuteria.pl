import { type JSX, type ReactNode } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/modules/discount/use-cases/get-admin-discounts-page", () => ({ getAdminDiscountsPageQuery: vi.fn() }))
vi.mock("~/src/modules/discount/use-cases/delete-discounts", () => ({ deleteDiscountsMutation: {} }))

import { type Discount } from "~/src/modules/discount/discount.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { useCouponsDataGridContext } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-data-grid"
import { useCouponsSheet } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-sheet"
import { couponsDataGrid } from "~/src/presentation/components/custom/pages/admin/coupons/utils/coupons-data-grid"

const helper = createColumnHelper<DataGridFeatures, Discount["adminListItem"]>()

const COLUMNS = helper.columns([helper.accessor("code", { header: "Code", id: "code" })])

const PlainGridProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const table = useTable<DataGridFeatures, Discount["adminListItem"]>({
    columns: COLUMNS,
    data: [buildCoupon()],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  return (
    <couponsDataGrid.Provider
      value={{
        columnReorder: { draggedColumnId: undefined, onColumnDragEnd: () => {}, onColumnDragOver: () => {}, onColumnDragStart: () => {} },
        hasPreferenceOverrides: false,
        isLoading: false,
        persistenceKey: couponsDataGrid.persistenceKey,
        resetPreferences: () => {},
        rowReorder: undefined,
        searchPlaceholder: "Search coupons",
        table,
      }}
    >
      {children}
    </couponsDataGrid.Provider>
  )
}

afterEach(cleanup)

describe("useCouponsDataGridContext", () => {
  it("refuses a grid that does not carry the coupon filters", () => {
    expect(() => renderHook(() => useCouponsDataGridContext(), { wrapper: PlainGridProvider })).toThrow(
      "useCouponsDataGridContext must be used within the coupons table Provider.",
    )
  })
})

describe("useCouponsSheet", () => {
  it("refuses to run outside the coupons sheet provider", () => {
    expect(() => renderHook(() => useCouponsSheet())).toThrow("useCouponsSheet must be used within CouponsSheetProvider")
  })
})
