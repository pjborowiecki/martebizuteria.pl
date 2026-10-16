import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "~/src/presentation/components/shadcn/alert-dialog"

afterEach(cleanup)

describe("AlertDialogContent", () => {
  it("keeps a 16px margin on both sides of a small phone screen", async () => {
    renderWithProviders(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    )

    const dialog = await screen.findByRole("alertdialog", { name: "Cancel this order?" })

    expect(dialog).toHaveClass("w-full", "max-w-[calc(100%-2rem)]", "data-[size=default]:sm:max-w-md")
  })
})
