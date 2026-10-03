import { type JSX, useState } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ORDER_TRACKING_NUMBER_MAX_LENGTH, ORDER_TRACKING_URL_MAX_LENGTH } from "~/src/modules/order/order.constants"

import { OrderShipDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-ship-dialog"

const spies = vi.hoisted(() => ({
  confirm: vi.fn<(tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => void>(),
  openChange: vi.fn<(open: boolean) => void>(),
}))

const ShipDialogHarness = ({ isPending = false }: Readonly<{ isPending?: boolean }>): JSX.Element => {
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
      <OrderShipDialog
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

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("OrderShipDialog", () => {
  it("explains that both tracking fields are optional", () => {
    renderWithProviders(<ShipDialogHarness />)

    expect(screen.getByRole("dialog", { name: "Mark order as shipped" })).toBeInTheDocument()
    expect(screen.getByText(/Both fields are optional/u)).toBeInTheDocument()
  })

  it("caps the tracking fields at the lengths the order accepts", () => {
    renderWithProviders(<ShipDialogHarness />)

    expect(trackingNumberField()).toHaveAttribute("maxLength", String(ORDER_TRACKING_NUMBER_MAX_LENGTH))
    expect(trackingUrlField()).toHaveAttribute("maxLength", String(ORDER_TRACKING_URL_MAX_LENGTH))
    expect(trackingUrlField()).toHaveAttribute("type", "url")
  })

  it("confirms the shipment with the trimmed tracking number and url", async () => {
    renderWithProviders(<ShipDialogHarness />)

    await userEvent.type(trackingNumberField(), "  00259007123456789012  ")
    await userEvent.type(trackingUrlField(), "https://inpost.pl/sledzenie-przesylek?number=00259007123456789012")
    await userEvent.click(screen.getByRole("button", { name: "Mark shipped" }))

    expect(spies.confirm).toHaveBeenCalledExactlyOnceWith({
      trackingNumber: "00259007123456789012",
      trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=00259007123456789012",
    })
  })

  it("confirms a shipment without tracking when the fields are left blank", async () => {
    renderWithProviders(<ShipDialogHarness />)

    await userEvent.type(trackingNumberField(), "   ")
    await userEvent.click(screen.getByRole("button", { name: "Mark shipped" }))

    expect(spies.confirm).toHaveBeenCalledExactlyOnceWith({ trackingNumber: undefined, trackingUrl: undefined })
  })

  it("forgets what was typed once the dialog is cancelled", async () => {
    renderWithProviders(<ShipDialogHarness />)

    await userEvent.type(trackingNumberField(), "TRK-9")
    await userEvent.type(trackingUrlField(), "https://tracking.test/TRK-9")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(spies.openChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(screen.queryByRole("dialog")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Reopen" }))

    expect(trackingNumberField()).toHaveValue("")
    expect(trackingUrlField()).toHaveValue("")
    expect(spies.confirm).not.toHaveBeenCalled()
  })

  it("forgets what was typed once the dialog is dismissed with escape", async () => {
    renderWithProviders(<ShipDialogHarness />)

    await userEvent.type(trackingNumberField(), "TRK-9")
    await userEvent.keyboard("{Escape}")

    expect(spies.openChange).toHaveBeenCalledWith(false)

    await userEvent.click(screen.getByRole("button", { name: "Reopen" }))

    expect(trackingNumberField()).toHaveValue("")
  })

  it("stays open and locks its buttons while the shipment is being saved", async () => {
    renderWithProviders(<ShipDialogHarness isPending />)

    await userEvent.keyboard("{Escape}")

    expect(spies.openChange).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Mark order as shipped" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Mark shipped" })).toBeDisabled()
  })

  it("spins the confirm button only while the shipment is being saved", () => {
    const { unmount } = renderWithProviders(<ShipDialogHarness isPending />)

    expect(screen.getByRole("button", { name: "Mark shipped" }).querySelector(".animate-spin")).not.toBeNull()

    unmount()
    renderWithProviders(<ShipDialogHarness />)

    expect(screen.getByRole("button", { name: "Mark shipped" }).querySelector(".animate-spin")).toBeNull()
  })
})
