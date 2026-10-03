import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ContentPageLeaveDialog } from "~/src/presentation/components/custom/pages/admin/content/content-page-leave-dialog"

const renderDialog = (open = true) => {
  const onLeave = vi.fn<() => void>()
  const onStay = vi.fn<() => void>()
  renderWithProviders(<ContentPageLeaveDialog onLeave={onLeave} onStay={onStay} open={open} />)

  return { onLeave, onStay }
}

afterEach(cleanup)

describe("ContentPageLeaveDialog", () => {
  it("asks whether to leave and says the unsaved changes will be lost", async () => {
    renderDialog()

    const dialog = await screen.findByRole("alertdialog", { name: "Leave without saving?" })

    expect(dialog).toHaveTextContent("Your changes to this page have not been saved and will be lost.")
  })

  it("stays out of the way until a navigation is held back", () => {
    renderDialog(false)

    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("discards the edits only when the admin chooses to leave", async () => {
    const { onLeave, onStay } = renderDialog()

    await userEvent.click(await screen.findByRole("button", { name: "Discard changes" }))

    expect(onLeave).toHaveBeenCalledOnce()
    expect(onStay).not.toHaveBeenCalled()
  })

  it("keeps the admin on the page when they choose to keep editing", async () => {
    const { onLeave, onStay } = renderDialog()

    await userEvent.click(await screen.findByRole("button", { name: "Keep editing" }))

    expect(onStay).toHaveBeenCalled()
    expect(onLeave).not.toHaveBeenCalled()
  })

  it("treats dismissing the question with Escape as keeping the edits", async () => {
    const { onLeave, onStay } = renderDialog()
    await screen.findByRole("alertdialog")

    await userEvent.keyboard("{Escape}")

    await waitFor(() => {
      expect(onStay).toHaveBeenCalledOnce()
    })
    expect(onLeave).not.toHaveBeenCalled()
  })
})
