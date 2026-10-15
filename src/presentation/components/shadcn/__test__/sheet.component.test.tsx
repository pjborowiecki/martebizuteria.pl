import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Sheet, SheetContent, SheetTitle } from "~/src/presentation/components/shadcn/sheet"

afterEach(cleanup)

describe("SheetContent", () => {
  it("gives the close button a full touch-sized target on touch screens", async () => {
    renderWithProviders(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Edit customer</SheetTitle>
        </SheetContent>
      </Sheet>,
    )

    expect(await screen.findByRole("button", { name: "Close" })).toHaveClass("size-7", "pointer-coarse:size-10")
  })
})
