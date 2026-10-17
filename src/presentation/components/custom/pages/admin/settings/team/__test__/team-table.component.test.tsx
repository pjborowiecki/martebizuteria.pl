import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { TEAM_ERROR, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { ROUTES } from "~/src/routes"

const mocks = vi.hoisted(() => ({
  fetchTeam: vi.fn<() => Promise<unknown>>(),
  revoke: vi.fn<(input: { userId: string }) => Promise<unknown>>(),
  signOut: vi.fn<(input: { fetchOptions: { onSuccess: () => void } }) => Promise<void>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signOut: mocks.signOut }))
vi.mock("~/src/modules/user/use-cases/list-admin-team", () => ({
  listAdminTeamQuery: () => ({ queryFn: mocks.fetchTeam, queryKey: ["admin", "users", "team"] }),
}))
vi.mock("~/src/modules/user/use-cases/revoke-admin-access", () => ({
  revokeAdminAccessMutation: { mutationFn: mocks.revoke, mutationKey: ["user", "revokeAdminAccess"] },
}))
vi.mock("~/src/modules/user/use-cases/grant-admin-access", () => ({
  grantAdminAccessMutation: { mutationFn: vi.fn(), mutationKey: ["user", "grantAdminAccess"] },
}))
vi.mock("~/src/modules/user/use-cases/search-team-candidates", () => ({
  searchTeamCandidatesQuery: (search: string) => ({
    queryFn: () => Promise.resolve([]),
    queryKey: ["admin", "users", "team", "candidates", search],
  }),
}))

const { TeamTable } = await import("~/src/presentation/components/custom/pages/admin/settings/team/components/team-table")

const ADA: User["adminTeamMember"] = {
  email: "ada@marte.test",
  hasGoogle: false,
  hasPassword: true,
  id: "user-ada",
  isCurrentUser: true,
  lastSignInAt: new Date("2026-10-15T08:00:00.000Z"),
  name: "Ada Admin",
  twoFactorEnabled: true,
}

const BOGNA: User["adminTeamMember"] = {
  email: "bogna@marte.test",
  hasGoogle: true,
  hasPassword: true,
  id: "user-bogna",
  isCurrentUser: false,
  lastSignInAt: undefined,
  name: "Bogna Admin",
  twoFactorEnabled: false,
}

const CEZARY: User["adminTeamMember"] = {
  ...BOGNA,
  email: "cezary@marte.test",
  hasGoogle: false,
  hasPassword: false,
  id: "user-cezary",
  name: "Cezary",
}

const renderTable = (team: Partial<User["adminTeam"]> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
  queryClient.setQueryData(USER_QUERY_KEYS.ADMIN.TEAM, { members: [ADA, BOGNA], recentSignIn: true, ...team })

  return renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <TeamTable />
    </Suspense>,
    { queryClient },
  )
}

const user = () => userEvent.setup({ delay: null })

const row = (name: string): HTMLElement => {
  const element = screen.getByText(name).closest("tr")
  if (element === null) {
    throw new Error(`no row for ${name}`)
  }

  return element
}

const bodyRows = (): HTMLElement[] => screen.getAllByRole("row").filter((element) => element.closest("tbody") !== null)

const openMenu = async (name: string) => {
  await user().click(screen.getByRole("button", { name: `Actions for ${name}` }))

  return screen.findByRole("menu")
}

const openRemoval = async () => {
  const menu = await openMenu("Bogna Admin")
  await user().click(within(menu).getByRole("menuitem", { name: "Remove access" }))

  return screen.findByRole("alertdialog", { name: "Remove admin access for Bogna Admin?" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchTeam.mockRejectedValue(new Error("the team is seeded by the test"))
  mocks.revoke.mockResolvedValue({ userId: BOGNA.id })
  mocks.signOut.mockResolvedValue()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  localStorage.clear()
})

describe("TeamTable list", () => {
  it("shows each admin with their address, two-factor state, sign-in methods and latest sign-in", () => {
    renderTable()

    expect(row("Ada Admin")).toHaveTextContent("ada@marte.test")
    expect(within(row("Ada Admin")).getByText("You")).toBeInTheDocument()
    expect(within(row("Ada Admin")).getByText("On")).toBeInTheDocument()
    expect(row("Ada Admin")).toHaveTextContent("Password")
    expect(row("Ada Admin")).toHaveTextContent("Oct 15, 2026")
    expect(within(row("Bogna Admin")).getByText("Off")).toBeInTheDocument()
    expect(row("Bogna Admin")).toHaveTextContent("Password and Google")
    expect(row("Bogna Admin")).toHaveTextContent("No sign-in recorded")
  })

  it("says when an admin has no way to sign in", () => {
    renderTable({ members: [ADA, CEZARY] })

    expect(row("Cezary")).toHaveTextContent("No sign-in method")
  })

  it("counts the admins with and without two-factor authentication and with Google", () => {
    renderTable()

    expect(screen.getByRole("button", { name: /^Admins 2/u })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /^Two-factor on 1/u })).toHaveTextContent("50% of all")
    expect(screen.getByRole("button", { name: /^Two-factor off 1/u })).toHaveTextContent("Panel closed until it is on")
    expect(screen.getByRole("button", { name: /^Sign in with Google 1/u })).toBeInTheDocument()
  })

  it("shares the admins without two-factor authentication where the shop does not require it", () => {
    vi.stubEnv("MODE", "preview")
    renderTable()

    expect(screen.getByRole("button", { name: /^Two-factor off 1/u })).toHaveTextContent("50% of all")
  })

  it("counts nothing in an empty team", () => {
    renderTable({ members: [] })

    expect(screen.getByRole("button", { name: /^Two-factor off 0/u })).toHaveTextContent("0% of all")
  })

  it("filters the admins from a card and shows them all again from the total", async () => {
    renderTable()

    await user().click(screen.getByRole("button", { name: /^Two-factor off/u }))

    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent("Bogna Admin")

    await user().click(screen.getByRole("button", { name: /^Two-factor on/u }))

    expect(bodyRows()[0]).toHaveTextContent("Ada Admin")

    await user().click(screen.getByRole("button", { name: /^Sign in with Google/u }))
    await user().click(screen.getByRole("button", { name: /^Sign in with Google/u }))

    expect(bodyRows()).toHaveLength(2)

    await user().click(screen.getByRole("button", { name: /^Sign in with Google/u }))
    await user().click(screen.getByRole("button", { name: /^Admins/u }))

    expect(bodyRows()).toHaveLength(2)
  })

  it("finds an admin by address", async () => {
    renderTable()

    fireEvent.change(screen.getByPlaceholderText("Search admins..."), { target: { value: "bogna@" } })

    await waitFor(() => {
      expect(bodyRows()).toHaveLength(1)
    })
  })

  it("reloads the team from the toolbar", async () => {
    mocks.fetchTeam.mockReturnValue(new Promise(() => {}))
    renderTable()

    await user().click(screen.getByRole("button", { name: "Reload table data" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reload table data" })).toBeDisabled()
    })
    expect(screen.getByRole("button", { name: /^Admins/u })).toHaveAttribute("aria-busy", "true")
  })

  it("opens and closes the add-admin sheet", async () => {
    renderTable()

    await user().click(screen.getByRole("button", { name: "Add admin" }))

    expect(await screen.findByRole("dialog", { name: "Add an admin" })).toBeInTheDocument()
    await user().click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})

describe("TeamTable access rules", () => {
  it("offers no way to change your own access, and says who can", async () => {
    renderTable()
    const menu = await openMenu("Ada Admin")

    expect(within(menu).getByRole("menuitem", { name: "Remove access" })).toHaveAttribute("aria-disabled", "true")
    expect(within(menu).getByText("Only another admin can change your access.")).toBeInTheDocument()
  })

  it("asks for a fresh sign-in before any change once the caller signed in more than a day ago", async () => {
    const { router } = renderTable({ recentSignIn: false })
    const buildLocation = vi.spyOn(router, "buildLocation")

    expect(screen.getByText(/To add or remove an admin, sign in again first/u)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add admin" })).toBeDisabled()
    const menu = await openMenu("Bogna Admin")
    expect(within(menu).getByRole("menuitem", { name: "Remove access" })).toHaveAttribute("aria-disabled", "true")
    await user().keyboard("{Escape}")

    await user().click(screen.getByRole("button", { name: "Sign in again" }))
    mocks.signOut.mock.calls[0]?.[0].fetchOptions.onSuccess()

    expect(buildLocation).toHaveBeenNthCalledWith(1, { to: ROUTES.ADMIN_SETTINGS_TEAM })
    expect(buildLocation).toHaveBeenNthCalledWith(2, { search: { redirect: ROUTES.ADMIN_SETTINGS_TEAM }, to: ROUTES.AUTH_SIGN_IN })
  })
})

describe("TeamTable removing admin access", () => {
  it("explains what removal does, removes the access and confirms it", async () => {
    renderTable()
    const dialog = await openRemoval()

    expect(within(dialog).getByText(/is signed out on every device right away/u)).toBeInTheDocument()
    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Bogna Admin is no longer an admin.")
    })
    expect(mocks.revoke.mock.calls[0]?.[0]).toStrictEqual({ userId: BOGNA.id })
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
  })

  it("confirms the removal once the refreshed team no longer lists the account", async () => {
    mocks.fetchTeam.mockResolvedValue({ members: [ADA], recentSignIn: true })
    renderTable()
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))

    await waitFor(() => {
      expect(screen.queryByText("Bogna Admin")).not.toBeInTheDocument()
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Bogna Admin is no longer an admin.")
  })

  it("keeps the dialog open while the removal runs", async () => {
    mocks.revoke.mockReturnValue(new Promise(() => {}))
    renderTable()
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))
    await user().keyboard("{Escape}")

    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("can be called off", async () => {
    renderTable()
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
    expect(mocks.revoke).not.toHaveBeenCalled()
  })

  it("says why the shop refused, in words, and reloads the team", async () => {
    mocks.revoke.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, TEAM_ERROR.LAST_ADMIN))
    const { queryClient } = renderTable()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "That would leave the shop without an admin. Reload the page to see the team as it is now.",
      )
    })
    expect(invalidate).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
  })

  it("asks for a fresh sign-in when the session went stale while the page was open", async () => {
    mocks.revoke.mockRejectedValue(new AppError(ERROR_CODES.AUTH_API_ERROR, "sessionNotFresh"))
    renderTable()
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("For your security, sign out and sign in again before making this change.")
    })
  })
})
