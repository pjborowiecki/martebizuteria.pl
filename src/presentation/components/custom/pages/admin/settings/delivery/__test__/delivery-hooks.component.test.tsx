import { type JSX, type ReactNode, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"

import { ATELIER, COURIER, INPOST } from "~/src/presentation/components/custom/pages/admin/settings/delivery/__test__/delivery-fixtures"

vi.mock("~/src/modules/delivery-method/use-cases/list-admin-delivery-methods", () => ({
  listAdminDeliveryMethodsQuery: () => ({
    queryFn: () => Promise.reject(new Error("the delivery methods are seeded by the test")),
    queryKey: ["admin", "delivery-methods"],
  }),
}))
vi.mock("~/src/modules/delivery-method/use-cases/create-delivery-method", () => ({
  createDeliveryMethodMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "create"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/update-delivery-method", () => ({
  updateDeliveryMethodMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "update"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/archive-delivery-method", () => ({
  archiveDeliveryMethodMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "archive"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/reorder-delivery-methods", () => ({
  reorderDeliveryMethodsMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "reorder"] },
}))

const { useDeliveryMethodSheet } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-method-sheet")
const { useDeliveryMethodsDataGrid, useDeliveryMethodsDataGridContext } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-methods-data-grid")
const { deliveryMethodsDataGrid } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/utils/delivery-methods-data-grid")

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL, { couriers: [ATELIER, INPOST], methods: [COURIER] })

  return (
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      <Suspense fallback={<p>loading</p>}>{children}</Suspense>
    </TestProviders>
  )
}

const renderGrid = async () => {
  const rendered = renderHook(() => useDeliveryMethodsDataGrid({ onRowClick: vi.fn<() => void>() }), { wrapper: Wrapper })
  await waitFor(() => {
    expect(rendered.result.current.table.getRowModel().rows).toHaveLength(1)
  })

  return rendered.result.current
}

describe("delivery settings hooks", () => {
  it("refuses to open the method sheet without its provider", () => {
    expect(() => renderHook(() => useDeliveryMethodSheet())).toThrow(
      "useDeliveryMethodSheet must be used within DeliveryMethodSheetProvider",
    )
  })

  it("refuses to read the delivery grid without its provider", () => {
    expect(() => renderHook(() => useDeliveryMethodsDataGridContext())).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })

  it("refuses a data grid provider that carries no status filter", async () => {
    const value = await renderGrid()
    const withoutStatusFilter = {
      columnReorder: value.columnReorder,
      hasPreferenceOverrides: value.hasPreferenceOverrides,
      isLoading: value.isLoading,
      persistenceKey: value.persistenceKey,
      resetPreferences: value.resetPreferences,
      rowReorder: value.rowReorder,
      searchPlaceholder: value.searchPlaceholder,
      table: value.table,
    }

    expect(() =>
      renderHook(() => useDeliveryMethodsDataGridContext(), {
        wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
          <deliveryMethodsDataGrid.Provider value={withoutStatusFilter}>{children}</deliveryMethodsDataGrid.Provider>
        ),
      }),
    ).toThrow("useDeliveryMethodsDataGridContext must be used within the delivery methods table Provider.")
  })
})
