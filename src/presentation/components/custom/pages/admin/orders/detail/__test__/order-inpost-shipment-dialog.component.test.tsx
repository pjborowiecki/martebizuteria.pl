import { type JSX, useState } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type InpostDeliveryType } from "~/src/modules/order/order.constants"

import { OrderInpostShipmentDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-inpost-shipment-dialog"

const spies = vi.hoisted(() => ({
  confirm: vi.fn<(parcel: { readonly parcelTemplate: string; readonly weightKg: number | undefined }) => void>(),
  openChange: vi.fn<(open: boolean) => void>(),
}))

const DialogHarness = ({
  deliveryType,
  isPending = false,
}: Readonly<{ deliveryType: InpostDeliveryType; isPending?: boolean }>): JSX.Element => {
  const [open, setOpen] = useState(true)

  return (
    <OrderInpostShipmentDialog
      deliveryType={deliveryType}
      isPending={isPending}
      onConfirm={spies.confirm}
      onOpenChange={(nextOpen) => {
        spies.openChange(nextOpen)
        setOpen(nextOpen)
      }}
      open={open}
    />
  )
}

const sizeField = () => screen.getByRole("combobox", { name: "Parcel size" })

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("OrderInpostShipmentDialog", () => {
  it("offers InPost's three locker sizes with their largest dimensions", () => {
    renderWithProviders(<DialogHarness deliveryType="locker" />)

    expect(screen.getByRole("dialog", { name: "Create an InPost shipment" })).toBeInTheDocument()
    expect(screen.getByText(/to the locker the customer chose/u)).toBeInTheDocument()
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual([
      "Size A, up to 8 × 38 × 64 cm",
      "Size B, up to 19 × 38 × 64 cm",
      "Size C, up to 41 × 38 × 64 cm",
    ])
    expect(sizeField()).toHaveValue("small")
  })

  it("books a locker parcel in the chosen size without asking for its weight", async () => {
    renderWithProviders(<DialogHarness deliveryType="locker" />)

    expect(screen.queryByRole("spinbutton", { name: "Weight (kg)" })).toBeNull()

    await userEvent.selectOptions(sizeField(), "large")
    await userEvent.click(screen.getByRole("button", { name: "Create shipment" }))

    expect(spies.confirm).toHaveBeenCalledExactlyOnceWith({ parcelTemplate: "large", weightKg: undefined })
  })

  it("asks for the weight of a courier parcel and books it with the size", async () => {
    renderWithProviders(<DialogHarness deliveryType="courier" />)

    expect(screen.getByText(/to the shipping address/u)).toBeInTheDocument()
    const weight = screen.getByRole("spinbutton", { name: "Weight (kg)" })
    expect(weight).toBeRequired()
    expect(weight).toHaveAttribute("max", "25")

    await userEvent.selectOptions(sizeField(), "medium")
    await userEvent.type(weight, "0.4")
    await userEvent.click(screen.getByRole("button", { name: "Create shipment" }))

    expect(spies.confirm).toHaveBeenCalledExactlyOnceWith({ parcelTemplate: "medium", weightKg: 0.4 })
  })

  it("closes when the admin cancels", async () => {
    renderWithProviders(<DialogHarness deliveryType="locker" />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(spies.openChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(spies.confirm).not.toHaveBeenCalled()
  })

  it("stays open and locks its buttons while InPost books the parcel", async () => {
    renderWithProviders(<DialogHarness deliveryType="locker" isPending />)

    await userEvent.keyboard("{Escape}")

    expect(spies.openChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Create shipment" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Create shipment" }).querySelector(".animate-spin")).not.toBeNull()
  })
})
