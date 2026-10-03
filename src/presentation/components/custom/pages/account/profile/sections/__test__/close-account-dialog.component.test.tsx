import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface DeleteResult {
  readonly error?: { readonly code?: string }
}

const calls = vi.hoisted(() => ({
  deleteUser: vi.fn<(input: { password?: string }) => Promise<DeleteResult>>(),
  toastError: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { deleteUser: calls.deleteUser } }))
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

import { CloseAccountDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-dialog"

const renderDialog = (open = true) => {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  renderWithProviders(<CloseAccountDialog hasPassword={false} onOpenChange={onOpenChange} open={open} />)

  return { onOpenChange }
}

const confirmButton = (): HTMLElement => screen.getByRole("button", { name: "Delete my account" })

beforeEach(() => {
  vi.clearAllMocks()
  calls.deleteUser.mockResolvedValue({})
})

afterEach(cleanup)

describe("CloseAccountDialog", () => {
  it("cannot be dismissed while the deletion is still running", async () => {
    const inFlight = Promise.withResolvers<DeleteResult>()
    calls.deleteUser.mockReturnValue(inFlight.promise)
    const { onOpenChange } = renderDialog()
    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE")

    await userEvent.click(confirmButton())
    await waitFor(() => {
      expect(confirmButton()).toBeDisabled()
    })
    await userEvent.keyboard("{Escape}")

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Type DELETE to confirm")).toHaveValue("DELETE")
    inFlight.resolve({ error: { code: "SESSION_EXPIRED" } })
    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("We could not delete your account. Please try again, or sign in again first.")
    })
  })

  it("closes and forgets the confirmation when dismissed with Escape", async () => {
    const { onOpenChange } = renderDialog()
    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE")

    await userEvent.keyboard("{Escape}")

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByLabelText("Type DELETE to confirm")).toHaveValue("")
  })

  it("tells its owner when a trigger asks to open it", async () => {
    const { onOpenChange } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Open from a trigger" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
