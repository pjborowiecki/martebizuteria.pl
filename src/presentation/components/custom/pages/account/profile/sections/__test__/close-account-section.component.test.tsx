import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CloseAccountSection } from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-section"

const DIALOG_TITLE = "Are you sure you want to delete your account?"

const openDialog = async (): Promise<void> => {
  renderWithProviders(<CloseAccountSection />)
  await userEvent.click(screen.getByRole("button", { name: "Delete Account" }))
}

const confirmButton = (): HTMLElement => {
  const buttons = screen.getAllByRole("button", { name: "Delete Account" })
  const last = buttons.at(-1)

  if (last === undefined) {
    throw new Error("The confirm button was not rendered")
  }

  return last
}

afterEach(() => {
  cleanup()
})

describe("CloseAccountSection", () => {
  it("warns about the consequences before any dialog is opened", () => {
    renderWithProviders(<CloseAccountSection />)

    expect(screen.getByText("Permanently delete account")).toBeInTheDocument()
    expect(screen.getByText("Before you do this, please note that account deletion is irreversible.")).toBeInTheDocument()
  })

  it("keeps the confirmation dialog closed initially", () => {
    renderWithProviders(<CloseAccountSection />)

    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument()
  })

  it("opens the confirmation dialog listing what is lost", async () => {
    await openDialog()

    expect(screen.getByText(DIALOG_TITLE)).toBeInTheDocument()
    expect(screen.getByText("Your order history will be lost.")).toBeInTheDocument()
    expect(screen.getByText("All saved addresses and payment methods will be erased.")).toBeInTheDocument()
    expect(screen.getByText("You will not have access to your wishlisted items.")).toBeInTheDocument()
  })

  it("keeps the confirm button disabled until DELETE is typed", async () => {
    await openDialog()

    expect(confirmButton()).toBeDisabled()
  })

  it("enables the confirm button once DELETE is typed", async () => {
    await openDialog()
    await userEvent.type(screen.getByRole("textbox"), "DELETE")

    expect(confirmButton()).toBeEnabled()
  })

  it("accepts the confirmation word in any case", async () => {
    await openDialog()
    await userEvent.type(screen.getByRole("textbox"), "delete")

    expect(confirmButton()).toBeEnabled()
  })

  it("keeps the confirm button disabled for a different word", async () => {
    await openDialog()
    await userEvent.type(screen.getByRole("textbox"), "remove")

    expect(confirmButton()).toBeDisabled()
  })

  it("closes the dialog once the deletion is confirmed", async () => {
    await openDialog()
    await userEvent.type(screen.getByRole("textbox"), "DELETE")
    await userEvent.click(confirmButton())

    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument()
  })

  it("discards the typed confirmation when the dialog is cancelled", async () => {
    await openDialog()
    await userEvent.type(screen.getByRole("textbox"), "DELETE")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }))

    expect(screen.getByRole("textbox")).toHaveValue("")
    expect(confirmButton()).toBeDisabled()
  })

  it("closes the dialog when the backdrop is clicked", async () => {
    await openDialog()
    await userEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument()
  })
})
