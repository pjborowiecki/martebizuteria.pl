import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface DeleteRequest {
  readonly password?: string
}

interface DeleteResult {
  readonly error?: { readonly code?: string }
}

const calls = vi.hoisted(() => ({
  deleteUser: vi.fn<(input: DeleteRequest) => Promise<DeleteResult>>(),
  toastError: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { deleteUser: calls.deleteUser } }))

import { CloseAccountSection } from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-section"

const DIALOG_TITLE = "Are you sure you want to delete your account?"

const CONFIRM_LABEL = "Delete my account"

const openDialog = async (hasPassword = true): Promise<void> => {
  renderWithProviders(<CloseAccountSection hasPassword={hasPassword} />)
  await userEvent.click(screen.getByRole("button", { name: "Delete Account" }))
}

const confirmButton = (): HTMLElement => screen.getByRole("button", { name: CONFIRM_LABEL })

const typeConfirmation = async (word = "DELETE"): Promise<void> => {
  await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), word)
}

const typePassword = async (password = "s3cret-pass"): Promise<void> => {
  await userEvent.type(screen.getByLabelText("Your password"), password)
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.deleteUser.mockResolvedValue({})
})

afterEach(cleanup)

describe("CloseAccountSection warnings", () => {
  it("warns about the consequences before any dialog is opened", () => {
    renderWithProviders(<CloseAccountSection hasPassword />)

    expect(screen.getByText("Permanently delete account")).toBeInTheDocument()
    expect(screen.getByText("Before you do this, please note that account deletion is irreversible.")).toBeInTheDocument()
  })

  it("keeps the confirmation dialog closed initially", () => {
    renderWithProviders(<CloseAccountSection hasPassword />)

    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument()
  })

  it("opens an accessible dialog that says truthfully what is lost and what is kept", async () => {
    await openDialog()

    expect(screen.getByRole("dialog", { name: DIALOG_TITLE })).toBeInTheDocument()
    expect(screen.getByText("Your saved addresses, saved cards and wishlist are erased.")).toBeInTheDocument()
    expect(
      screen.getByText("Your past orders stay in our accounting records, as the law requires, but you will no longer see them here."),
    ).toBeInTheDocument()
    expect(screen.getByText("You are signed out on every device, and this cannot be undone.")).toBeInTheDocument()
  })
})

describe("CloseAccountSection confirmation", () => {
  it("keeps the confirm button disabled until DELETE and a password are given", async () => {
    await openDialog()

    expect(confirmButton()).toBeDisabled()

    await typeConfirmation()

    expect(confirmButton()).toBeDisabled()

    await typePassword()

    expect(confirmButton()).toBeEnabled()
  })

  it("accepts the confirmation word in any case", async () => {
    await openDialog()
    await typeConfirmation("delete")
    await typePassword()

    expect(confirmButton()).toBeEnabled()
  })

  it("keeps the confirm button disabled for a different word", async () => {
    await openDialog()
    await typeConfirmation("remove")
    await typePassword()

    expect(confirmButton()).toBeDisabled()
  })

  it("asks for no password from an account that signs in with a provider", async () => {
    await openDialog(false)

    expect(screen.queryByLabelText("Your password")).toBeNull()
    expect(
      screen.getByText("You signed in with Google or GitHub, so no password is needed. If this fails, sign in again and retry."),
    ).toBeInTheDocument()

    await typeConfirmation()

    expect(confirmButton()).toBeEnabled()
  })

  it("discards what was typed when the dialog is cancelled", async () => {
    await openDialog()
    await typeConfirmation()
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }))

    expect(screen.getByLabelText("Type DELETE to confirm")).toHaveValue("")
    expect(confirmButton()).toBeDisabled()
  })
})

describe("CloseAccountSection deletion", () => {
  it("deletes the account with the password the customer confirmed with", async () => {
    await openDialog()
    await typeConfirmation()
    await typePassword()
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.deleteUser).toHaveBeenCalledOnce()
    })
    expect(calls.deleteUser.mock.calls[0]?.[0].password).toBe("s3cret-pass")
  })

  it("sends no password for an account that has none", async () => {
    await openDialog(false)
    await typeConfirmation()
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.deleteUser).toHaveBeenCalledOnce()
    })
    expect(calls.deleteUser.mock.calls[0]?.[0]).not.toHaveProperty("password")
  })

  it("sends the deleted customer to the storefront home page", async () => {
    const location = { href: "/account/profile" }
    vi.stubGlobal("location", location)
    await openDialog()
    await typeConfirmation()
    await typePassword()
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(location.href).toBe("/")
    })
    vi.unstubAllGlobals()
  })

  it("says the password was wrong instead of blaming the network", async () => {
    calls.deleteUser.mockResolvedValue({ error: { code: "INVALID_PASSWORD" } })
    await openDialog()
    await typeConfirmation()
    await typePassword()
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("That password is not right.")
    })
    expect(screen.getByRole("dialog", { name: DIALOG_TITLE })).toBeInTheDocument()
  })

  it("reports any other failure and keeps the account", async () => {
    calls.deleteUser.mockResolvedValue({ error: { code: "SESSION_EXPIRED" } })
    await openDialog()
    await typeConfirmation()
    await typePassword()
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("We could not delete your account. Please try again, or sign in again first.")
    })
  })

  it("blocks a second confirmation while the first is still running", async () => {
    const inFlight = Promise.withResolvers<DeleteResult>()
    calls.deleteUser.mockReturnValue(inFlight.promise)
    await openDialog()
    await typeConfirmation()
    await typePassword()
    await userEvent.click(confirmButton())

    expect(confirmButton()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()

    inFlight.resolve({})
    await waitFor(() => {
      expect(calls.deleteUser).toHaveBeenCalledOnce()
    })
  })
})
