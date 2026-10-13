import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"

const calls = vi.hoisted(() => ({
  saveCredential: vi.fn<(input: Readonly<Record<string, string>>) => Promise<{ ok: true }>>(),
  toastError: vi.fn<(message: string, options: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/modules/account/use-cases/set-account-password", () => ({
  setAccountPasswordMutation: { mutationFn: calls.saveCredential, mutationKey: ["account", "setAccountPassword"] },
}))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { changePassword: vi.fn(), twoFactor: {} } }))
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

import { SecuritySection } from "~/src/presentation/components/custom/pages/account/profile/sections/security-section"
import { SetPasswordDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/set-password-dialog"

const NEW_PASSWORD = "GooglePassword1!"

const renderDialog = (open = true) => {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  const { queryClient } = renderWithProviders(<SetPasswordDialog onOpenChange={onOpenChange} open={open} />)

  return { invalidateQueries: vi.spyOn(queryClient, "invalidateQueries"), onOpenChange }
}

const fillPasswords = async (confirmation = NEW_PASSWORD): Promise<void> => {
  await userEvent.type(screen.getByLabelText("New password"), NEW_PASSWORD)
  await userEvent.type(screen.getByLabelText("Confirm new password"), confirmation)
}

const submitButton = (): HTMLElement => screen.getByRole("button", { name: "Set password" })

beforeEach(() => {
  vi.clearAllMocks()
  calls.saveCredential.mockResolvedValue({ ok: true })
})

afterEach(cleanup)

describe("SetPasswordDialog", () => {
  it("adds the password, confirms it, closes and reloads the account so two-factor can be turned on", async () => {
    const { invalidateQueries, onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(submitButton())

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })
    })
    expect(calls.saveCredential.mock.calls[0]?.[0]).toStrictEqual({ newPassword: NEW_PASSWORD })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(calls.toastSuccess).toHaveBeenCalledWith("Password set", {
      description: "You can now also sign in with your email address and password.",
    })
    expect(screen.getByLabelText("New password")).toHaveValue("")
  })

  it("explains a refusal, reloads the account in case it changed elsewhere, and keeps the dialog open with what was typed", async () => {
    calls.saveCredential.mockRejectedValue(new Error("INTERNAL_ERROR"))
    const { invalidateQueries, onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(submitButton())

    await waitFor(() => {
      expect(calls.toastError.mock.calls[0]?.[0]).toBe("Could not set your password")
    })
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })
    })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("New password")).toHaveValue(NEW_PASSWORD)
  })

  it("sends nothing while the confirmation does not match", async () => {
    renderDialog()
    await fillPasswords("SomethingElse1!")

    await userEvent.click(submitButton())

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
    expect(calls.saveCredential).not.toHaveBeenCalled()
  })

  it("discards what was typed when the user cancels", async () => {
    const { onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByLabelText("New password")).toHaveValue("")
  })

  it("stays open and locks its buttons while the password is being saved", async () => {
    const inFlight = Promise.withResolvers<{ ok: true }>()
    calls.saveCredential.mockReturnValue(inFlight.promise)
    const { onOpenChange } = renderDialog()
    await fillPasswords()

    await userEvent.click(submitButton())
    await waitFor(() => {
      expect(submitButton()).toBeDisabled()
    })
    await userEvent.keyboard("{Escape}")

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalled()
    inFlight.resolve({ ok: true })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("tells its owner when a trigger asks to open it", async () => {
    const { onOpenChange } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Open from a trigger" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})

describe("SecuritySection for an account without a password", () => {
  it("offers to set a password instead of changing one", () => {
    renderWithProviders(<SecuritySection hasPassword={false} twoFactorEnabled={false} />)

    expect(screen.getByText("Set Password")).toBeInTheDocument()
    expect(screen.getByText("You sign in with Google. Add a password to also sign in with your email address.")).toBeInTheDocument()
    expect(screen.queryByText("Change Password")).toBeNull()
  })

  it("explains that two-factor authentication waits for a password and keeps its button disabled", () => {
    renderWithProviders(<SecuritySection hasPassword={false} twoFactorEnabled={false} />)

    expect(screen.getByText("Set a password first: two-factor authentication protects signing in with your password.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enable" })).toBeDisabled()
  })

  it("opens the set-password dialog from the Set button", async () => {
    renderWithProviders(<SecuritySection hasPassword={false} twoFactorEnabled={false} />)

    await userEvent.click(screen.getByRole("button", { name: "Set" }))

    expect(await screen.findByRole("heading", { name: "Set a password" })).toBeInTheDocument()
  })
})
