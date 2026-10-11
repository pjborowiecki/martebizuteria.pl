import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewsletterSendDialog } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-send-dialog"

const renderDialog = (isPending: boolean) => {
  const onConfirm = vi.fn<() => void>()
  const onOpenChange = vi.fn<(open: boolean) => void>()
  renderWithProviders(
    <NewsletterSendDialog isPending={isPending} onConfirm={onConfirm} onOpenChange={onOpenChange} open recipientCount={1} />,
  )

  return { onConfirm, onOpenChange }
}

afterEach(cleanup)

describe("NewsletterSendDialog", () => {
  it("names how many subscribers the newsletter reaches and that it cannot be sent again", () => {
    renderDialog(false)

    expect(screen.getByRole("alertdialog", { name: "Send this newsletter?" })).toHaveTextContent(
      "It goes to 1 confirmed subscriber now, each in their own language. A sent newsletter cannot be recalled or sent again.",
    )
  })

  it("sends on confirmation", async () => {
    const { onConfirm } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Send now" }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("closes when the owner keeps editing", async () => {
    const { onConfirm, onOpenChange } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("stays open and offers nothing to press while the newsletter is being handed over", async () => {
    const { onOpenChange } = renderDialog(true)

    await userEvent.keyboard("{Escape}")

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Send now" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Keep editing" })).toBeDisabled()
  })
})
