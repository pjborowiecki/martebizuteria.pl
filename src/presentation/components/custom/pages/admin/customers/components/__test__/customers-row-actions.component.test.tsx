import { act, cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface MutateOptions {
  readonly onSuccess: () => void
}

const session = vi.hoisted(() => ({ value: undefined as { user: { id: string } } | undefined }))

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(input: { userId: string }, options: MutateOptions) => void>(),
}))

const browser = vi.hoisted(() => ({ writeText: vi.fn<(text: string) => Promise<void>>() }))

const toasts = vi.hoisted(() => ({ error: vi.fn<(message: string) => void>(), success: vi.fn<(message: string) => void>() }))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getCurrentSessionQuery: {
    queryFn: () => Promise.resolve(session.value),
    queryKey: ["session", "current"],
    retry: false,
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/hooks/use-delete-customer", () => ({
  useDeleteCustomer: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { CustomersRowActions } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-row-actions"

import { customerRow } from "./customers-grid-harness"
import { ROUTES } from "~/src/routes"

const CUSTOMER = customerRow({ email: "anna@example.com", id: "user-1", name: "Anna Kowalska", stripeCustomerId: "cus_123" })

const openMenu = async (customer = CUSTOMER) => {
  const rendered = renderWithProviders(<CustomersRowActions customer={customer} />, { router: createTestRouter() })
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("The customer row action trigger was not rendered")
  }
  await userEvent.click(trigger)

  return rendered
}

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
  session.value = { user: { id: "admin-1" } }
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: browser.writeText } })
  browser.writeText.mockResolvedValue(undefined)
})

describe("CustomersRowActions menu", () => {
  it("names the view action after the customer it opens", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "View Anna Kowalska" })).toBeInTheDocument()
  })

  it("offers every copy action with its translated label", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Copy ID" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy email" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy Stripe customer ID" })).toBeInTheDocument()
  })

  it("navigates to the customer detail page for this row", async () => {
    const { router } = await openMenu()
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(undefined)
    await userEvent.click(await screen.findByRole("menuitem", { name: "View Anna Kowalska" }))

    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ params: { id: "user-1" }, to: ROUTES.ADMIN_CUSTOMER }))
  })

  it("copies the record id and confirms it", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy ID" }))

    expect(browser.writeText).toHaveBeenCalledWith("user-1")
    expect(toasts.success).toHaveBeenCalledWith("Customer ID copied to clipboard")
  })

  it("copies the email address and confirms it", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy email" }))

    expect(browser.writeText).toHaveBeenCalledWith("anna@example.com")
    expect(toasts.success).toHaveBeenCalledWith("Email copied to clipboard")
  })

  it("copies the trimmed Stripe customer id and confirms it", async () => {
    await openMenu(customerRow({ id: "user-1", stripeCustomerId: "  cus_456  " }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy Stripe customer ID" }))

    expect(browser.writeText).toHaveBeenCalledWith("cus_456")
    expect(toasts.success).toHaveBeenCalledWith("Stripe customer ID copied to clipboard")
  })

  it("reports a missing Stripe customer id instead of copying an empty string", async () => {
    await openMenu(customerRow({ id: "user-1", stripeCustomerId: null }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy Stripe customer ID" }))

    expect(browser.writeText).not.toHaveBeenCalled()
    expect(toasts.error).toHaveBeenCalledWith("This customer has no Stripe customer ID")
  })

  it("treats a blank Stripe customer id as missing", async () => {
    await openMenu(customerRow({ id: "user-1", stripeCustomerId: "   " }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy Stripe customer ID" }))

    expect(browser.writeText).not.toHaveBeenCalled()
    expect(toasts.error).toHaveBeenCalledWith("This customer has no Stripe customer ID")
  })
})

describe("CustomersRowActions deletion guard", () => {
  it("offers deletion for another customer account", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Delete account" })).toBeInTheDocument()
  })

  it("withdraws deletion once the session shows the row is the signed in admin", async () => {
    session.value = { user: { id: "user-1" } }
    await openMenu()
    await screen.findByRole("menuitem", { name: "Copy ID" })

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Delete account" })).toBeNull()
    })
  })

  it("never offers to delete another administrator", async () => {
    await openMenu(customerRow({ id: "user-2", role: ROLES.ADMIN }))

    expect(await screen.findByRole("menuitem", { name: "Copy ID" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "Delete account" })).toBeNull()
  })
})

describe("CustomersRowActions deletion", () => {
  it("asks for confirmation naming the customer and the GDPR consequence", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete account" }))

    expect(await screen.findByText("Delete customer account?")).toBeInTheDocument()
    expect(
      await screen.findByText(
        "This action cannot be undone. Anna Kowalska (anna@example.com) will be permanently deleted under GDPR, and we will send an account-deletion confirmation email to the customer.",
      ),
    ).toBeInTheDocument()
  })

  it("does not delete anything until the deletion is confirmed", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete account" }))

    expect(deletion.mutate).not.toHaveBeenCalled()
  })

  it("deletes only this customer on confirmation", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete account" }))
    await userEvent.click(await screen.findByRole("button", { name: "Delete account" }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual({ userId: "user-1" })
  })

  it("closes the confirmation once the deletion succeeded", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete account" }))
    await userEvent.click(await screen.findByRole("button", { name: "Delete account" }))
    act(() => {
      deletion.mutate.mock.calls[0]?.[1]?.onSuccess()
    })

    expect(screen.queryByText("Delete customer account?")).toBeNull()
  })
})
