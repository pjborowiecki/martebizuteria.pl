import { type JSX, type ReactNode, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

vi.mock("~/src/modules/user/use-cases/list-admin-team", () => ({
  listAdminTeamQuery: () => ({
    queryFn: () => Promise.reject(new Error("the team is seeded by the test")),
    queryKey: ["admin", "users", "team"],
  }),
}))
vi.mock("~/src/modules/user/use-cases/revoke-admin-access", () => ({
  revokeAdminAccessMutation: { mutationFn: vi.fn(), mutationKey: ["user", "revokeAdminAccess"] },
}))
vi.mock("~/src/modules/user/use-cases/grant-admin-access", () => ({
  grantAdminAccessMutation: { mutationFn: vi.fn(), mutationKey: ["user", "grantAdminAccess"] },
}))

const { useTeamColumns } = await import("~/src/presentation/components/custom/pages/admin/settings/team/components/team-columns")
const { useTeamDataGrid, useTeamDataGridContext } =
  await import("~/src/presentation/components/custom/pages/admin/settings/team/hooks/use-team-data-grid")
const { teamDataGrid } = await import("~/src/presentation/components/custom/pages/admin/settings/team/utils/team-data-grid")

afterEach(cleanup)

const MEMBER: User["adminTeamMember"] = {
  email: "bogna@marte.test",
  hasGoogle: true,
  hasPassword: true,
  id: "user-bogna",
  isCurrentUser: false,
  lastSignInAt: new Date("2026-10-15T08:00:00.000Z"),
  name: "Bogna Admin",
  twoFactorEnabled: false,
}

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(USER_QUERY_KEYS.ADMIN.TEAM, { members: [MEMBER], recentSignIn: true })

  return (
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      <Suspense fallback={<p>loading</p>}>{children}</Suspense>
    </TestProviders>
  )
}

describe("useTeamColumns export values", () => {
  it("exports every data column as the text its cell shows", () => {
    const { result } = renderHook(() => useTeamColumns(), { wrapper: Wrapper })

    expect(
      Object.fromEntries(
        result.current.flatMap((column): [string, string | undefined][] =>
          column.id === undefined ? [] : [[column.id, column.meta?.exportValue?.(MEMBER)]],
        ),
      ),
    ).toStrictEqual({
      actions: undefined,
      email: "bogna@marte.test",
      lastSignIn: "Oct 15, 2026, 10:00 AM",
      name: "Bogna Admin",
      signInMethods: "Password and Google",
      twoFactor: "Off",
    })
  })
})

describe("useTeamDataGrid", () => {
  it("names the quick filter in an export of a filtered team", async () => {
    const { result } = renderHook(() => useTeamDataGrid(), { wrapper: Wrapper })
    await waitFor(() => {
      expect(result.current.table.getRowModel().rows).toHaveLength(1)
    })

    expect(result.current.exportSource?.filters).toStrictEqual([])

    result.current.applyStatFilter("google")

    await waitFor(() => {
      expect(result.current.exportSource?.filters).toStrictEqual([{ label: "Quick filter", value: "Sign in with Google" }])
    })
  })

  it("refuses to run outside the team grid's provider", () => {
    expect(() => renderHook(() => useTeamDataGridContext())).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })

  it("refuses a data grid provider that carries no stat filter", async () => {
    const grid = renderHook(() => useTeamDataGrid(), { wrapper: Wrapper })
    await waitFor(() => {
      expect(grid.result.current.table.getRowModel().rows).toHaveLength(1)
    })
    const value = grid.result.current
    const withoutStatFilter = {
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
      renderHook(() => useTeamDataGridContext(), {
        wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
          <teamDataGrid.Provider value={withoutStatFilter}>{children}</teamDataGrid.Provider>
        ),
      }),
    ).toThrow("useTeamDataGridContext must be used within the team table Provider.")
  })
})
