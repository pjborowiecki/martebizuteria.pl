import { type JSX, useState } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderRefundDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-refund-dialog"

const spies = vi.hoisted(() => ({
  confirm: vi.fn<(restock: boolean) => void>(),
  openChange: vi.fn<(open: boolean) => void>(),
}))

const RefundDialogHarness = ({ isPending = false, restockByDefault = false }: Readonly<RefundDialogHarnessProps>): JSX.Element => {
  const [open, setOpen] = useState(true)

  return (
    <OrderRefundDialog
      displayId="MRT-2026-00042"
      isPending={isPending}
      onConfirm={spies.confirm}
      onOpenChange={(nextOpen) => {
        spies.openChange(nextOpen)
        setOpen(nextOpen)
      }}
      open={open}
      restockByDefault={restockByDefault}
    />
  )
}

interface RefundDialogHarnessProps {
  readonly isPending?: boolean
  readonly restockByDefault?: boolean
}

const restockCheckbox = () => screen.getByRole("checkbox", { name: "The items came back to stock" })

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("OrderRefundDialog", () => {
  it("names the order and tells the admin that the stock follows their answer, not the refund", () => {
    renderWithProviders(<RefundDialogHarness />)

    expect(screen.getByRole("alertdialog", { name: "Refund this order?" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "This issues a full refund for order MRT-2026-00042 through Stripe. The customer is emailed about it once Stripe confirms the refund.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/Leave it clear for a lost parcel or a goodwill refund/u)).toBeInTheDocument()
  })

  it("leaves the items out of stock unless the admin ticks that they came back", () => {
    renderWithProviders(<RefundDialogHarness />)

    expect(restockCheckbox()).not.toBeChecked()
  })

  it("starts ticked for an order whose items are expected back in stock", () => {
    renderWithProviders(<RefundDialogHarness restockByDefault />)

    expect(restockCheckbox()).toBeChecked()
  })

  it("confirms the refund with the admin's answer", async () => {
    renderWithProviders(<RefundDialogHarness />)

    await userEvent.click(restockCheckbox())
    await userEvent.click(screen.getByRole("button", { name: "Refund order" }))

    expect(spies.confirm).toHaveBeenCalledExactlyOnceWith(true)
  })

  it("closes without refunding when the admin keeps the order", async () => {
    renderWithProviders(<RefundDialogHarness />)

    await userEvent.click(screen.getByRole("button", { name: "Keep order" }))

    expect(spies.openChange).toHaveBeenCalledWith(false)
    expect(spies.confirm).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("stays open and locks its controls while the refund is being requested", async () => {
    renderWithProviders(<RefundDialogHarness isPending />)

    await userEvent.keyboard("{Escape}")

    expect(spies.openChange).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog", { name: "Refund this order?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep order" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Refund order" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Refund order" }).querySelector(".animate-spin")).not.toBeNull()
    expect(restockCheckbox()).toHaveAttribute("aria-disabled", "true")
  })
})
