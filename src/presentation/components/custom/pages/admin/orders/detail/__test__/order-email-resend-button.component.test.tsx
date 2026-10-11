import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const resend = vi.hoisted(() => ({ mutate: vi.fn<(variables: unknown) => void>(), pending: { current: false } }))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useResendOrderEmail: () => ({ isPending: resend.pending.current, mutate: resend.mutate }),
}))

import { ORDER_ID } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderEmailResendButton } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-email-resend-button"

beforeEach(() => {
  resend.mutate.mockReset()
  resend.pending.current = false
})

afterEach(() => {
  cleanup()
})

describe("OrderEmailResendButton", () => {
  it("asks the server to send the email of that delivery again", async () => {
    renderWithProviders(<OrderEmailResendButton eventId="audit-3" orderId={ORDER_ID} />)

    await userEvent.click(screen.getByRole("button", { name: "Resend email" }))

    expect(resend.mutate).toHaveBeenCalledExactlyOnceWith({ eventId: "audit-3", orderId: ORDER_ID })
  })

  it("cannot be pressed again while the email is being sent", () => {
    resend.pending.current = true

    renderWithProviders(<OrderEmailResendButton eventId="audit-3" orderId={ORDER_ID} />)

    expect(screen.getByRole("button", { name: "Resend email" })).toBeDisabled()
  })
})
