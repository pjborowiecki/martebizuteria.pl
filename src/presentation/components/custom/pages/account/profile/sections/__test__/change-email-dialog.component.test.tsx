import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface ChangeEmailRequest {
  readonly fetchOptions: { readonly onError: (context: { error: unknown }) => void; readonly onSuccess: () => void }
  readonly newEmail: string
}

const calls = vi.hoisted(() => ({
  changeEmail: vi.fn<(input: ChangeEmailRequest) => Promise<unknown>>(),
  toastError: vi.fn<(message: string, options: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { changeEmail: calls.changeEmail } }))
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

import { ChangeEmailDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/change-email-dialog"

const CURRENT_EMAIL = "anna@example.com"

const renderDialog = (open = true) => {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  renderWithProviders(<ChangeEmailDialog currentEmail={CURRENT_EMAIL} onOpenChange={onOpenChange} open={open} />)

  return { onOpenChange }
}

const emailField = (): HTMLElement => screen.getByLabelText("New email address")

const submitNewEmail = async (email: string): Promise<void> => {
  await userEvent.type(emailField(), email)
  await userEvent.click(screen.getByRole("button", { name: "Send confirmation" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.changeEmail.mockImplementation((input) => {
    input.fetchOptions.onSuccess()

    return Promise.resolve({ data: { status: true }, error: null })
  })
})

afterEach(cleanup)

describe("ChangeEmailDialog", () => {
  it("says the confirmation link goes out before the address changes", () => {
    renderDialog()

    expect(screen.getByRole("dialog", { name: "Change your email address" })).toBeInTheDocument()
    expect(
      screen.getByText("We will send a confirmation link to anna@example.com. The address changes once you confirm it."),
    ).toBeInTheDocument()
  })

  it("asks better-auth to move the account to the new address", async () => {
    renderDialog()

    await submitNewEmail("anna.nowak@example.com")

    await waitFor(() => {
      expect(calls.changeEmail).toHaveBeenCalledOnce()
    })
    expect(calls.changeEmail.mock.calls[0]?.[0].newEmail).toBe("anna.nowak@example.com")
  })

  it("says the link was sent only if the new address can take it, then clears the field and closes", async () => {
    const { onOpenChange } = renderDialog()

    await submitNewEmail("anna.nowak@example.com")

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(calls.toastSuccess).toHaveBeenCalledWith("Confirm the change", {
      description:
        "If the new address is available, we've sent a confirmation link to anna@example.com. If nothing arrives within a few minutes, try again.",
    })
    expect(emailField()).toHaveValue("")
  })

  it("explains why the change was refused and keeps the dialog open", async () => {
    calls.changeEmail.mockImplementation((input) => {
      input.fetchOptions.onError({ error: { code: "USER_ALREADY_EXISTS" } })

      return Promise.resolve({ data: null, error: { code: "USER_ALREADY_EXISTS" } })
    })
    const { onOpenChange } = renderDialog()

    await submitNewEmail("taken@example.com")

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("We could not change your email", {
        description: "An account with this email already exists.",
      })
    })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(emailField()).toHaveValue("taken@example.com")
  })

  it("explains that emails are unavailable instead of claiming a link was sent", async () => {
    calls.changeEmail.mockImplementation((input) => {
      input.fetchOptions.onError({ error: { code: "EMAIL_DELIVERY_UNAVAILABLE", status: 503 } })

      return Promise.resolve({ data: null, error: { code: "EMAIL_DELIVERY_UNAVAILABLE", status: 503 } })
    })
    const { onOpenChange } = renderDialog()

    await submitNewEmail("anna.nowak@example.com")

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("We could not change your email", {
        description: "We can't send emails at the moment, so nothing has been changed. Please try again in a few minutes.",
      })
    })
    expect(calls.toastSuccess).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("refuses an address that is not an email before asking the server", async () => {
    renderDialog()

    await submitNewEmail("not-an-email")

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(calls.changeEmail).not.toHaveBeenCalled()
  })

  it("discards the typed address when the customer cancels", async () => {
    const { onOpenChange } = renderDialog()
    await userEvent.type(emailField(), "anna.nowak@example.com")

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(emailField()).toHaveValue("")
  })

  it("stays open and locks its buttons while the change is being sent", async () => {
    const inFlight = Promise.withResolvers<unknown>()
    calls.changeEmail.mockReturnValue(inFlight.promise)
    const { onOpenChange } = renderDialog()

    await submitNewEmail("anna.nowak@example.com")
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send confirmation" })).toBeDisabled()
    })
    await userEvent.keyboard("{Escape}")

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalled()
    inFlight.resolve({ data: null, error: null })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send confirmation" })).toBeEnabled()
    })
  })

  it("tells its owner when a trigger asks to open it", async () => {
    const { onOpenChange } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Open from a trigger" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
