import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as AlertDialogComponents from "~/src/presentation/components/shadcn/alert-dialog"

vi.mock("~/src/presentation/components/shadcn/alert-dialog", async (importOriginal) => ({
  ...(await importOriginal<typeof AlertDialogComponents>()),
  AlertDialog: ({ onOpenChange }: Readonly<{ onOpenChange: (open: boolean) => void }>): JSX.Element => (
    <>
      <button
        type="button"
        onClick={() => {
          onOpenChange(true)
        }}
      >
        report opening
      </button>
      <button
        type="button"
        onClick={() => {
          onOpenChange(false)
        }}
      >
        report closing
      </button>
    </>
  ),
}))

import { ContentPageLeaveDialog } from "~/src/presentation/components/custom/pages/admin/content/content-page-leave-dialog"

afterEach(cleanup)

describe("ContentPageLeaveDialog open state reports", () => {
  it("does not read the dialog opening as a decision to stay", async () => {
    const onStay = vi.fn<() => void>()
    renderWithProviders(<ContentPageLeaveDialog onLeave={vi.fn<() => void>()} onStay={onStay} open />)

    await userEvent.click(screen.getByRole("button", { name: "report opening" }))

    expect(onStay).not.toHaveBeenCalled()
  })

  it("reads the dialog closing as a decision to stay", async () => {
    const onStay = vi.fn<() => void>()
    renderWithProviders(<ContentPageLeaveDialog onLeave={vi.fn<() => void>()} onStay={onStay} open />)

    await userEvent.click(screen.getByRole("button", { name: "report closing" }))

    expect(onStay).toHaveBeenCalledOnce()
  })
})
