import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface ChangePasswordRequest {
  readonly currentPassword: string
  readonly fetchOptions: { readonly onError: (context: { error: unknown }) => void; readonly onSuccess: () => void }
  readonly newPassword: string
  readonly revokeOtherSessions: boolean
}

const calls = vi.hoisted(() => ({
  changePassword: vi.fn<(input: ChangePasswordRequest) => Promise<unknown>>(),
  toastError: vi.fn<(message: string, options: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { changePassword: calls.changePassword } }))
vi.mock(import("~/src/presentation/components/shadcn/dialog"), async (importOriginal) => {
  const actual = await importOriginal()
  const { Dialog: DialogPrimitive } = await import("@base-ui/react/dialog")

  return {
    ...actual,
    Dialog: ({ children, ...props }: Parameters<typeof actual.Dialog>[0]) => (
      <actual.Dialog {...props}>
        <DialogPrimitive.Trigger>Open from a trigger</DialogPrimitive.Trigger>
        {typeof children === "function" ? undefined : children}
      </actual.Dialog>
    ),
  }
})

import { ChangePasswordDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/change-password-dialog"

const renderDialog = (open = true) => {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  renderWithProviders(<ChangePasswordDialog onOpenChange={onOpenChange} open={open} />)

  return { onOpenChange }
}

const fillPasswords = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText("Current password"), "OldPassword1!")
  await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!")
  await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!")
}

const submitButton = (): HTMLElement => screen.getByRole("button", { name: "Change password" })

beforeEach(() => {
  vi.clearAllMocks()
  calls.changePassword.mockImplementation((input) => {
    input.fetchOptions.onSuccess()

    return Promise.resolve({ data: {}, error: null })
  })
})

afterEach(cleanup)

describe("ChangePasswordDialog", () => {
  it("confirms the new password, clears the fields and closes", async () => {
    const { onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(submitButton())

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(calls.toastSuccess).toHaveBeenCalledWith("Password changed", { description: "Use your new password next time you sign in." })
    expect(screen.getByLabelText("Current password")).toHaveValue("")
  })

  it("signs the customer's other devices out by default", async () => {
    renderDialog()
    await fillPasswords()

    await userEvent.click(submitButton())

    await waitFor(() => {
      expect(calls.changePassword).toHaveBeenCalledWith(
        expect.objectContaining({ currentPassword: "OldPassword1!", newPassword: "NewPassword1!", revokeOtherSessions: true }),
      )
    })
  })

  it("keeps the customer's other devices signed in when they untick the option", async () => {
    renderDialog()
    await fillPasswords()
    const revokeOtherSessions = screen.getByRole("checkbox", { name: "Sign out my other devices" })
    expect(revokeOtherSessions).toBeChecked()

    await userEvent.click(revokeOtherSessions)
    expect(revokeOtherSessions).not.toBeChecked()
    await userEvent.click(submitButton())

    await waitFor(() => {
      expect(calls.changePassword).toHaveBeenCalledWith(expect.objectContaining({ revokeOtherSessions: false }))
    })
  })

  it("explains a rejected current password and keeps the dialog open", async () => {
    calls.changePassword.mockImplementation((input) => {
      input.fetchOptions.onError({ error: { code: "INVALID_PASSWORD" } })

      return Promise.resolve({ data: null, error: { code: "INVALID_PASSWORD" } })
    })
    const { onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(submitButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("Could not change your password", { description: "Invalid password." })
    })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Current password")).toHaveValue("OldPassword1!")
  })

  it("discards what was typed when the customer cancels", async () => {
    const { onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByLabelText("New password")).toHaveValue("")
  })

  it("stays open and locks its buttons while the change is being saved", async () => {
    const inFlight = Promise.withResolvers<unknown>()
    calls.changePassword.mockReturnValue(inFlight.promise)
    const { onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(submitButton())
    await waitFor(() => {
      expect(submitButton()).toBeDisabled()
    })
    await userEvent.keyboard("{Escape}")

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalled()
    inFlight.resolve({ data: null, error: null })
    await waitFor(() => {
      expect(submitButton()).toBeEnabled()
    })
  })

  it("tells its owner when a trigger asks to open it", async () => {
    const { onOpenChange } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Open from a trigger" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
