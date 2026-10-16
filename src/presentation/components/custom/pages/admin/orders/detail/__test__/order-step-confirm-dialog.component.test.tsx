import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Package } from "lucide-react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { OrderStepConfirmDialog } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-step-confirm-dialog"

const renderDialog = (isPending: boolean) => {
  const onConfirm = vi.fn<() => void>()
  const onOpenChange = vi.fn<(open: boolean) => void>()
  renderWithProviders(
    <OrderStepConfirmDialog
      cancelLabel="Not now"
      confirmLabel="Start fulfillment"
      description="Order MRT-2026-00001 moves to “In progress”."
      icon={Package}
      isPending={isPending}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open
      title="Start fulfillment?"
    />,
  )

  return { onConfirm, onOpenChange }
}

afterEach(() => {
  cleanup()
})

describe("OrderStepConfirmDialog", () => {
  it("confirms the step and keeps the click from reaching an orders table row", async () => {
    const { onConfirm } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Start fulfillment" }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByRole("alertdialog", { name: "Start fulfillment?" }).closest("[data-prevent-row-click]")).not.toBeNull()
  })

  it("closes on the back-out button and stops the dismissal from opening the row behind it", async () => {
    const { onOpenChange } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Not now" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })

  it("stays open while the step is being saved", async () => {
    const { onOpenChange } = renderDialog(true)

    await userEvent.keyboard("{Escape}")

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Start fulfillment" })).toBeDisabled()
  })
})
