import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

vi.mock("~/src/modules/customer-account/use-cases/get-customer-login-history-page", () => ({
  getCustomerLoginHistoryPage: vi.fn(),
  getCustomerLoginHistoryPageQuery: (input: unknown) => ({
    queryFn: () => Promise.resolve({ hasMore: false, items: [], limit: 10, offset: 0, total: 0 }),
    queryKey: ["customer-account", "login-history", input],
  }),
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-customer-session", () => ({
  revokeCustomerSessionMutation: { mutationFn: vi.fn(), mutationKey: ["customer-account", "revoke-session"] },
}))

const { useSessionColumns } = await import("~/src/presentation/components/custom/pages/admin/settings/security/components/sessions-columns")
const { useLoginHistoryDataGrid, useLoginHistoryDataGridContext } =
  await import("~/src/presentation/components/custom/pages/admin/settings/security/hooks/use-login-history-data-grid")
const { loginHistoryDataGrid } =
  await import("~/src/presentation/components/custom/pages/admin/settings/security/utils/login-history-data-grid")

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const SESSION: CustomerAccount["session"] = {
  browser: "Chrome 140",
  createdAt: new Date("2026-10-01T09:00:00.000Z"),
  device: "iPhone",
  deviceType: "mobile",
  id: "session-2",
  ipAddress: "203.0.113.4",
  isCurrent: false,
  lastActiveAt: new Date("2026-10-02T09:00:00.000Z"),
}

describe("useSessionColumns export values", () => {
  it("exports every data column as the text its cell shows", () => {
    const { result } = renderHook(() => useSessionColumns(), { wrapper: Wrapper })
    const values = Object.fromEntries(
      result.current.flatMap((column): [string, string | undefined][] =>
        column.id === undefined ? [] : [[column.id, column.meta?.exportValue?.(SESSION)]],
      ),
    )

    expect(values).toMatchObject({
      actions: undefined,
      browser: "Chrome 140",
      device: "iPhone",
      ipAddress: "203.0.113.4",
      signedIn: "Oct 1, 2026, 11:00 AM",
    })
    expect(values["lastActive"]).not.toBe("Active now")
  })
})

describe("useLoginHistoryDataGridContext", () => {
  it("refuses to run outside the sign-in history grid's provider", () => {
    expect(() => renderHook(() => useLoginHistoryDataGridContext())).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })

  it("refuses a data grid provider that carries no result filter", async () => {
    const grid = renderHook(() => useLoginHistoryDataGrid(), { wrapper: Wrapper })
    await waitFor(() => {
      expect(grid.result.current.isLoading).toBe(false)
    })
    const value = grid.result.current
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
      renderHook(() => useLoginHistoryDataGridContext(), {
        wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
          <loginHistoryDataGrid.Provider value={withoutStatusFilter}>{children}</loginHistoryDataGrid.Provider>
        ),
      }),
    ).toThrow("useLoginHistoryDataGridContext must be used within the sign-in history table Provider.")
  })
})
