import { type JSX, useState } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ORDER_TRACKING_NUMBER_MAX_LENGTH } from "~/src/modules/order/order.constants"

import { OrderTrackingDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tracking-dialog"

const spies = vi.hoisted(() => ({
  confirm: vi.fn<(tracking: { readonly trackingNumber: string; readonly trackingUrl: string | undefined }) => void>(),
  openChange: vi.fn<(open: boolean) => void>(),
}))

const TrackingDialogHarness = ({ isPending = false }: Readonly<{ isPending?: boolean }>): JSX.Element => {
  const [open, setOpen] = useState(true)

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
        }}
        type="button"
      >
        Reopen
      </button>
      <OrderTrackingDialog
        isPending={isPending}
        onConfirm={spies.confirm}
        onOpenChange={(nextOpen) => {
          spies.openChange(nextOpen)
          setOpen(nextOpen)
        }}
        open={open}
      />
    </>
  )
}

const trackingNumberField = () => screen.getByRole("textbox", { name: "Tracking number" })

const trackingUrlField = () => screen.getByRole("textbox", { name: "Tracking URL" })

const saveButton = () => screen.getByRole("button", { name: "Save tracking number" })

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("OrderTrackingDialog", () => {
  it("says the shipping date stays and names the tracking number email the customer receives", () => {
    renderWithProviders(<TrackingDialogHarness />)

    const dialog = screen.getByRole("dialog", { name: "Save the tracking number?" })

    expect(dialog).toHaveTextContent("The shipping date stays as it is.")
    expect(dialog).toHaveTextContent(
      "The customer receives the “Tracking number notice” email with this number, unless it is the number already saved.",
    )
  })

  it("asks for a tracking number before it can be saved", async () => {
    renderWithProviders(<TrackingDialogHarness />)

    expect(trackingNumberField()).toBeRequired()
    expect(trackingNumberField()).toHaveAttribute("maxLength", String(ORDER_TRACKING_NUMBER_MAX_LENGTH))
    expect(saveButton()).toBeDisabled()

    await userEvent.type(trackingNumberField(), "   ")

    expect(saveButton()).toBeDisabled()
  })

  it("saves the trimmed tracking number and link", async () => {
    renderWithProviders(<TrackingDialogHarness />)

    await userEvent.type(trackingNumberField(), "  TRK-50  ")
    await userEvent.type(trackingUrlField(), "https://tracking.test/TRK-50")
    await userEvent.click(saveButton())

    expect(spies.confirm).toHaveBeenCalledExactlyOnceWith({ trackingNumber: "TRK-50", trackingUrl: "https://tracking.test/TRK-50" })
  })

  it("saves a tracking number without a link", async () => {
    renderWithProviders(<TrackingDialogHarness />)

    await userEvent.type(trackingNumberField(), "TRK-50")
    await userEvent.type(trackingUrlField(), "   ")
    await userEvent.click(saveButton())

    expect(spies.confirm).toHaveBeenCalledExactlyOnceWith({ trackingNumber: "TRK-50", trackingUrl: undefined })
  })

  it("forgets what was typed once the dialog is cancelled", async () => {
    renderWithProviders(<TrackingDialogHarness />)

    await userEvent.type(trackingNumberField(), "TRK-50")
    await userEvent.type(trackingUrlField(), "https://tracking.test/TRK-50")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(spies.openChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(screen.queryByRole("dialog")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Reopen" }))

    expect(trackingNumberField()).toHaveValue("")
    expect(trackingUrlField()).toHaveValue("")
    expect(spies.confirm).not.toHaveBeenCalled()
  })

  it("stays open, locks its buttons and spins while the number is being saved", async () => {
    renderWithProviders(<TrackingDialogHarness isPending />)

    await userEvent.keyboard("{Escape}")

    expect(spies.openChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(saveButton()).toBeDisabled()
    expect(saveButton().querySelector(".animate-spin")).not.toBeNull()
  })
})
