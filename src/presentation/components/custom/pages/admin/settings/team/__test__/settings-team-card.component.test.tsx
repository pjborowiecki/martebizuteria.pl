import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { TEAM_ERROR, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { ROUTES } from "~/src/routes"

const mocks = vi.hoisted(() => ({
  revoke: vi.fn<(input: { userId: string }) => Promise<unknown>>(),
  signOut: vi.fn<(input: { fetchOptions: { onSuccess: () => void } }) => Promise<void>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signOut: mocks.signOut }))
vi.mock("~/src/modules/user/use-cases/list-admin-team", () => ({
  listAdminTeamQuery: () => ({
    queryFn: () => Promise.reject(new Error("the team is seeded by the test")),
    queryKey: ["admin", "users", "team"],
  }),
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

const { SettingsTeamCard } = await import("~/src/presentation/components/custom/pages/admin/settings/team/settings-team-card")
const { SettingsTeamRulesCard } = await import("~/src/presentation/components/custom/pages/admin/settings/team/settings-team-rules-card")

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

const renderCard = (team: Partial<User["adminTeam"]> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(USER_QUERY_KEYS.ADMIN.TEAM, { members: [ADA, BOGNA], recentSignIn: true, ...team })

  return renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <SettingsTeamCard />
    </Suspense>,
    { queryClient },
  )
}

const user = () => userEvent.setup({ delay: null })

const row = (name: string): HTMLElement => {
  const element = screen.getByText(name).closest("[data-slot=settings-row]")
  if (!(element instanceof HTMLElement)) {
    throw new Error(`no row for ${name}`)
  }

  return element
}

const openRemoval = async () => {
  await user().click(screen.getByRole("button", { name: "Remove admin access for Bogna Admin" }))

  return screen.findByRole("alertdialog", { name: "Remove admin access for Bogna Admin?" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.revoke.mockResolvedValue({ userId: BOGNA.id })
  mocks.signOut.mockResolvedValue()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe("SettingsTeamCard list", () => {
  it("shows each admin with their address, sign-in methods, two-factor state and latest sign-in", () => {
    renderCard()

    expect(within(row("Ada Admin")).getByText("ada@marte.test")).toBeInTheDocument()
    expect(within(row("Ada Admin")).getByText("You")).toBeInTheDocument()
    expect(within(row("Ada Admin")).getByText("Two-factor on")).toBeInTheDocument()
    expect(within(row("Ada Admin")).getByText(/Signs in with a password · Last sign-in Oct 15, 2026/u)).toBeInTheDocument()
    expect(within(row("Bogna Admin")).getByText("Two-factor off")).toBeInTheDocument()
    expect(within(row("Bogna Admin")).getByText("Signs in with a password and Google · No sign-in recorded")).toBeInTheDocument()
  })

  it("warns about an admin who still has to turn on two-factor authentication", () => {
    renderCard()

    expect(within(row("Bogna Admin")).getByText("Must turn on two-factor authentication before the panel opens.")).toBeInTheDocument()
    expect(within(row("Ada Admin")).queryByText("Must turn on two-factor authentication before the panel opens.")).not.toBeInTheDocument()
  })

  it("leaves out the two-factor warning where the shop does not require it", () => {
    vi.stubEnv("MODE", "preview")
    renderCard()

    expect(screen.queryByText("Must turn on two-factor authentication before the panel opens.")).not.toBeInTheDocument()
  })

  it("says when an admin has no way to sign in", () => {
    renderCard({ members: [ADA, CEZARY] })

    expect(within(row("Cezary")).getByText("No sign-in method · No sign-in recorded")).toBeInTheDocument()
  })

  it("offers no way to change your own access, and says who can", () => {
    renderCard()

    expect(within(row("Ada Admin")).queryByRole("button")).not.toBeInTheDocument()
    expect(within(row("Ada Admin")).getByText("Only another admin can change your access.")).toBeInTheDocument()
    expect(within(row("Bogna Admin")).getByRole("button", { name: "Remove admin access for Bogna Admin" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Add admin" })).toBeEnabled()
  })

  it("asks for a fresh sign-in before any change once the caller signed in more than a day ago", async () => {
    const { router } = renderCard({ recentSignIn: false })
    const buildLocation = vi.spyOn(router, "buildLocation")

    expect(screen.getByText(/To add or remove an admin, sign in again first/u)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add admin" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Remove admin access for Bogna Admin" })).toBeDisabled()

    await user().click(screen.getByRole("button", { name: "Sign in again" }))
    mocks.signOut.mock.calls[0]?.[0].fetchOptions.onSuccess()

    expect(buildLocation).toHaveBeenNthCalledWith(1, { to: ROUTES.ADMIN_SETTINGS_TEAM })
    expect(buildLocation).toHaveBeenNthCalledWith(2, { search: { redirect: ROUTES.ADMIN_SETTINGS_TEAM }, to: ROUTES.AUTH_SIGN_IN })
  })

  it("opens the add-admin dialog", async () => {
    renderCard()

    await user().click(screen.getByRole("button", { name: "Add admin" }))

    expect(await screen.findByRole("dialog", { name: "Add an admin" })).toBeInTheDocument()
    await user().click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})

describe("removing admin access", () => {
  it("explains what removal does, removes the access and confirms it", async () => {
    renderCard()
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

  it("keeps the dialog open while the removal runs", async () => {
    mocks.revoke.mockReturnValue(new Promise(() => {}))
    renderCard()
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))
    await user().keyboard("{Escape}")

    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("can be called off", async () => {
    renderCard()
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
    expect(mocks.revoke).not.toHaveBeenCalled()
  })

  it("says why the shop refused, in words, and reloads the team", async () => {
    mocks.revoke.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, TEAM_ERROR.LAST_ADMIN))
    const { queryClient } = renderCard()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "That would leave the shop without an admin. Reload the page to see the team as it is now.",
      )
    })
    expect(invalidate).toHaveBeenCalled()
  })

  it("asks for a fresh sign-in when the session went stale while the page was open", async () => {
    mocks.revoke.mockRejectedValue(new AppError(ERROR_CODES.AUTH_API_ERROR, "sessionNotFresh"))
    renderCard()
    const dialog = await openRemoval()

    await user().click(within(dialog).getByRole("button", { name: "Remove access" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("For your security, sign out and sign in again before making this change.")
    })
  })
})

describe("SettingsTeamRulesCard", () => {
  it("lists the rules every change on the page follows", () => {
    renderWithProviders(<SettingsTeamRulesCard />)

    expect(screen.getByRole("heading", { name: "How admin access works" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual([
      "Only an account with a confirmed email address can become an admin.",
      "Nobody can change their own access, so the shop always keeps at least one admin.",
      "Adding or removing an admin needs a sign-in from the last 24 hours.",
      "Removing access signs the person out on every device at once. Their customer account stays.",
      "An admin account cannot be deleted. Its admin access has to be removed first.",
      "Every change is recorded in the audit log, with who made it.",
    ])
  })
})
