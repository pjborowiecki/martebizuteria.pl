import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Dialog, DialogContent, DialogTitle } from "~/src/presentation/components/shadcn/dialog"

afterEach(cleanup)

const renderDialog = () =>
  renderWithProviders(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Mark the order as shipped with a tracking number</DialogTitle>
      </DialogContent>
    </Dialog>,
  )

describe("DialogContent", () => {
  it("gives the close button a full touch-sized target on touch screens", async () => {
    renderDialog()

    expect(await screen.findByRole("button", { name: "Close" })).toHaveClass("pointer-coarse:size-10")
  })

  it("keeps a long title clear of the close button", async () => {
    renderDialog()

    expect(await screen.findByText("Mark the order as shipped with a tracking number")).toHaveClass("pr-8")
  })
})
