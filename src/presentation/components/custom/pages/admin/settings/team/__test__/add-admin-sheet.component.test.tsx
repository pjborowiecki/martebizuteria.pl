import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { TEAM_ERROR } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

const mocks = vi.hoisted(() => ({
  grant: vi.fn<(input: { userId: string }) => Promise<unknown>>(),
  search: vi.fn<(search: string) => Promise<readonly unknown[]>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/user/use-cases/grant-admin-access", () => ({
  grantAdminAccessMutation: { mutationFn: mocks.grant, mutationKey: ["user", "grantAdminAccess"] },
}))
vi.mock("~/src/modules/user/use-cases/revoke-admin-access", () => ({
  revokeAdminAccessMutation: { mutationFn: vi.fn(), mutationKey: ["user", "revokeAdminAccess"] },
}))
vi.mock("~/src/modules/user/use-cases/search-team-candidates", () => ({
  searchTeamCandidatesQuery: (search: string) => ({
    queryFn: () => mocks.search(search),
    queryKey: ["admin", "users", "team", "candidates", search],
  }),
}))

const { AddAdminSheet } = await import("~/src/presentation/components/custom/pages/admin/settings/team/add-admin-sheet")

const candidate = (overrides: Partial<User["teamCandidate"]>): User["teamCandidate"] => ({
  banned: false,
  email: "celina@marte.test",
  emailVerified: true,
  id: "user-celina",
  name: "Celina Klientka",
  twoFactorEnabled: false,
  ...overrides,
})

const CELINA = candidate({})

const DAREK = candidate({ email: "darek@marte.test", emailVerified: false, id: "user-darek", name: "Darek" })

const EWA = candidate({ banned: true, email: "ewa@marte.test", id: "user-ewa", name: "Ewa" })

const user = () => userEvent.setup({ delay: null })

const renderDialog = () => {
  const onClose = vi.fn<() => void>()

  return { onClose, ...renderWithProviders(<AddAdminSheet onClose={onClose} />) }
}

const search = async (term: string): Promise<HTMLElement> => {
  await user().type(screen.getByLabelText("Email address or name"), term)

  return screen.findByRole("list", { name: "Email address or name" })
}

const chooseCelina = async (): Promise<HTMLElement> => {
  const results = await search("celina")
  await user().click(within(results).getByRole("button", { name: "Choose Celina Klientka" }))

  return screen.findByRole("dialog", { name: "Make Celina Klientka an admin?" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.search.mockResolvedValue([CELINA, DAREK, EWA])
  mocks.grant.mockResolvedValue({ userId: CELINA.id })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe("AddAdminSheet search", () => {
  it("waits for three characters before it searches", async () => {
    renderDialog()

    await user().type(screen.getByLabelText("Email address or name"), "ce")

    expect(screen.getByText("Type at least 3 characters.")).toBeInTheDocument()
    await new Promise((resolve) => {
      setTimeout(resolve, 400)
    })
    expect(mocks.search).not.toHaveBeenCalled()
  })

  it("lists matching customer accounts and explains why some cannot become admins", async () => {
    renderDialog()

    const results = await search("marte")

    expect(mocks.search).toHaveBeenLastCalledWith("marte")
    expect(within(results).getByRole("button", { name: "Choose Celina Klientka" })).toBeEnabled()
    expect(within(results).getByRole("button", { name: "Choose Darek" })).toBeDisabled()
    expect(within(results).getByText("Email address not confirmed")).toBeInTheDocument()
    expect(within(results).getByRole("button", { name: "Choose Ewa" })).toBeDisabled()
    expect(within(results).getByText("Account blocked")).toBeInTheDocument()
    expect(screen.getByText(/so the shop's security emails reach the right person/u)).toBeInTheDocument()
    expect(screen.getByText("A blocked account cannot become an admin. Unblock it first.")).toBeInTheDocument()
  })

  it("adds no notes when every account found can become an admin", async () => {
    mocks.search.mockResolvedValue([CELINA])
    renderDialog()

    await search("celina")

    expect(screen.queryByText(/so the shop's security emails reach the right person/u)).not.toBeInTheDocument()
    expect(screen.queryByText("A blocked account cannot become an admin. Unblock it first.")).not.toBeInTheDocument()
  })

  it("says while it searches, and when nothing matches", async () => {
    const pending: { resolve?: (value: readonly unknown[]) => void } = {}
    mocks.search.mockReturnValue(
      new Promise((resolve) => {
        pending.resolve = resolve
      }),
    )
    renderDialog()

    await user().type(screen.getByLabelText("Email address or name"), "nobody")

    expect(await screen.findByText("Searching…")).toBeInTheDocument()
    pending.resolve?.([])
    expect(await screen.findByText(/No customer account matches/u)).toBeInTheDocument()
  })

  it("lists the rules every change to admin access follows under the search", () => {
    renderDialog()

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

  it("grants nothing when Enter is pressed in the search before an account is chosen", async () => {
    const { onClose } = renderDialog()

    await user().type(screen.getByLabelText("Email address or name"), "celina{Enter}")

    expect(mocks.grant).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("closes when called off", async () => {
    const { onClose } = renderDialog()

    await user().click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe("AddAdminSheet confirmation", () => {
  it("says what admin access allows and that two-factor authentication comes first", async () => {
    renderDialog()

    const dialog = await chooseCelina()

    expect(within(dialog).getByText("Check what the account will be able to do, then give it access.")).toBeInTheDocument()
    expect(within(dialog).getByRole("heading", { name: "Celina Klientka" })).toBeInTheDocument()
    expect(within(dialog).getByText("The account celina@marte.test will be able to:")).toBeInTheDocument()
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(4)
    expect(within(dialog).getByText(/two-factor authentication has to be turned on/u)).toBeInTheDocument()
  })

  it("skips the two-factor note for an account that already uses it, or where the shop does not require it", async () => {
    mocks.search.mockResolvedValue([candidate({ twoFactorEnabled: true })])
    renderDialog()

    const dialog = await chooseCelina()

    expect(within(dialog).queryByText(/two-factor authentication has to be turned on/u)).not.toBeInTheDocument()
    cleanup()

    vi.stubEnv("MODE", "preview")
    mocks.search.mockResolvedValue([CELINA])
    renderDialog()

    expect(within(await chooseCelina()).queryByText(/two-factor authentication has to be turned on/u)).not.toBeInTheDocument()
  })

  it("goes back to the search", async () => {
    renderDialog()
    const dialog = await chooseCelina()

    await user().click(within(dialog).getByRole("button", { name: "Back" }))

    expect(await screen.findByRole("dialog", { name: "Add an admin" })).toBeInTheDocument()
  })

  it("grants the access, confirms it and closes", async () => {
    const { onClose } = renderDialog()
    const dialog = await chooseCelina()

    await user().click(within(dialog).getByRole("button", { name: "Make admin" }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })
    expect(mocks.grant.mock.calls[0]?.[0]).toStrictEqual({ userId: CELINA.id })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Celina Klientka is now an admin.")
  })

  it("stays open while the grant runs", async () => {
    mocks.grant.mockReturnValue(new Promise(() => {}))
    const { onClose } = renderDialog()
    const dialog = await chooseCelina()

    await user().click(within(dialog).getByRole("button", { name: "Make admin" }))
    await user().keyboard("{Escape}")

    expect(within(dialog).getByRole("button", { name: "Back" })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("closes on Escape before anything was sent", async () => {
    const { onClose } = renderDialog()

    await user().keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("says in words why the shop refused", async () => {
    mocks.grant.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, TEAM_ERROR.EMAIL_NOT_VERIFIED))
    const { onClose } = renderDialog()
    const dialog = await chooseCelina()

    await user().click(within(dialog).getByRole("button", { name: "Make admin" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("This account's email address is not confirmed yet.")
    })
    expect(onClose).toHaveBeenCalledOnce()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })
})
