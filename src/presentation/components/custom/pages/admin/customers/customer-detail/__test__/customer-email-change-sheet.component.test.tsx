import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CUSTOMER_EMAIL_CHANGE_ERROR } from "~/src/modules/user/user.constants"

import copy from "~/messages/en-US/pages.admin.json"

interface EmailChangeRequest {
  readonly newEmail: string
  readonly orderNumber: string
  readonly postalCode: string
  readonly userId: string
}

const mocks = vi.hoisted(() => ({
  request: vi.fn<(input: EmailChangeRequest) => Promise<{ newEmail: string }>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/user/use-cases/request-customer-email-change", () => ({
  requestCustomerEmailChangeMutation: { mutationFn: mocks.request, mutationKey: ["user", "requestCustomerEmailChange"] },
}))

const { CustomerEmailChangeSheet } =
  await import("~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-email-change-sheet")

const CUSTOMER = { email: "anna@example.com", id: "user-anna", name: "Anna Kowalska" } as const

const { errors } = copy.customerDetail.emailChange

const user = () => userEvent.setup({ delay: null })

const renderSheet = () => {
  const onClose = vi.fn<() => void>()
  renderWithProviders(<CustomerEmailChangeSheet customer={CUSTOMER} onClose={onClose} />)

  return { onClose, sheet: screen.getByRole("dialog", { name: "Change email address" }) }
}

const fill = (sheet: HTMLElement, values: Partial<Record<"New email address" | "Order number" | "Delivery postal code", string>>): void => {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(within(sheet).getByLabelText(label), { target: { value } })
  }
}

const fillAll = (sheet: HTMLElement): void => {
  fill(sheet, { "Delivery postal code": " 31-042 ", "New email address": "anna.nowak@example.com", "Order number": " MRT-2026-00042 " })
}

const submit = (sheet: HTMLElement) => user().click(within(sheet).getByRole("button", { name: "Send link" }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.request.mockResolvedValue({ newEmail: "anna.nowak@example.com" })
})

afterEach(cleanup)

describe("CustomerEmailChangeSheet", () => {
  it("asks for the order the customer names and the new address, beside the address the account has now", () => {
    const { sheet } = renderSheet()

    expect(within(sheet).getByText(/Send Anna Kowalska a link to confirm a new sign-in address/u)).toBeInTheDocument()
    expect(within(sheet).getByRole("heading", { name: "Check it is the customer" })).toBeInTheDocument()
    expect(within(sheet).getByLabelText("Order number")).toHaveAttribute("maxLength", "32")
    expect(within(sheet).getByLabelText("Delivery postal code")).toHaveAttribute("maxLength", "32")
    expect(within(sheet).getByDisplayValue("anna@example.com")).toHaveAttribute("readOnly")
    expect(within(sheet).getByLabelText("New email address")).toHaveAttribute("type", "email")
  })

  it("lists the rules every change of address follows", () => {
    const { sheet } = renderSheet()

    expect(within(sheet).getByRole("heading", { name: "How the change works" })).toBeInTheDocument()
    expect(
      within(sheet).getByText("After 5 attempts within an hour, the account cannot be checked again until the hour has passed."),
    ).toBeInTheDocument()
    expect(within(sheet).getAllByRole("listitem")).toHaveLength(5)
  })

  it("explains each missing detail instead of sending anything", async () => {
    const { sheet } = renderSheet()

    fill(sheet, { "Order number": " - " })
    await submit(sheet)

    expect(await within(sheet).findByText("Enter the order number the customer gave.")).toBeInTheDocument()
    expect(within(sheet).getByText("Enter the postal code the customer gave.")).toBeInTheDocument()
    expect(within(sheet).getByText("Enter a valid email address.")).toBeInTheDocument()
    expect(within(sheet).getByLabelText("New email address")).toHaveAttribute("aria-invalid", "true")
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it("sends the trimmed details for this account, says where the link went and closes", async () => {
    const { onClose, sheet } = renderSheet()

    fillAll(sheet)
    await submit(sheet)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })
    expect(mocks.request.mock.calls[0]?.[0]).toStrictEqual({
      newEmail: "anna.nowak@example.com",
      orderNumber: "MRT-2026-00042",
      postalCode: "31-042",
      userId: "user-anna",
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Link sent to anna.nowak@example.com. The address changes once the customer opens it.")
  })

  it("clears the earlier explanations once the details are complete", async () => {
    const { sheet } = renderSheet()
    await submit(sheet)
    expect(await within(sheet).findByText("Enter the order number the customer gave.")).toBeInTheDocument()

    fillAll(sheet)
    await submit(sheet)

    await waitFor(() => {
      expect(within(sheet).queryByText("Enter the order number the customer gave.")).not.toBeInTheDocument()
    })
  })

  it("locks the sheet while the request is on its way", async () => {
    mocks.request.mockReturnValue(new Promise(() => {}))
    const { sheet } = renderSheet()

    fillAll(sheet)
    await submit(sheet)

    await waitFor(() => {
      expect(within(sheet).getByRole("button", { name: "Send link" })).toBeDisabled()
    })
    expect(within(sheet).getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(within(sheet).getByLabelText("Order number")).toBeDisabled()
  })

  it.each(Object.values(CUSTOMER_EMAIL_CHANGE_ERROR))("keeps the sheet open and explains a %s refusal", async (reason) => {
    mocks.request.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, reason))
    const { onClose, sheet } = renderSheet()

    fillAll(sheet)
    await submit(sheet)

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(errors[reason])
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("falls back to the panel's own wording for any other failure", async () => {
    mocks.request.mockRejectedValue(new AppError(ERROR_CODES.FORBIDDEN))
    const { sheet } = renderSheet()

    fillAll(sheet)
    await submit(sheet)

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("You don't have permission to do this.")
    })
  })

  it("closes without sending anything on Cancel", async () => {
    const { onClose, sheet } = renderSheet()

    await user().click(within(sheet).getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(mocks.request).not.toHaveBeenCalled()
  })
})
