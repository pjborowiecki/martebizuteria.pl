import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { toastSuccess, updateCustomer } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  updateCustomer: vi.fn<(input: { id: string; values: Record<string, unknown> }) => Promise<{ ok: true }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: toastSuccess } }))
vi.mock("~/src/modules/user/use-cases/update-customer", () => ({
  updateCustomerMutation: { mutationFn: updateCustomer, mutationKey: ["user", "update-customer"] },
}))

import { type User } from "~/src/modules/user/user.types"

import {
  CustomerForm,
  CustomerFormProvider,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
import { CustomerFormSections } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-sections"

const JOINED_AT = new Date("2026-01-15T10:00:00.000Z")

const customerDetail = (): User["adminCustomerDetail"] => ({
  addressForm: { address1: "ul. Mokotowska 12/4", city: "Warszawa", countryCode: "PL", postalCode: "00-640" },
  averageOrderValue: 24_900,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: JOINED_AT,
  customTags: ["vip"],
  email: "anna@example.com",
  emailVerified: true,
  id: "usr_1",
  image: null,
  initials: "AK",
  isAnonymous: false,
  isReturning: true,
  joinDate: "15 Jan 2026",
  metadata: null,
  monthlySpending: [],
  name: "Anna Kowalska",
  notes: "Prefers pickup at the atelier.",
  orderCount: 3,
  orders: [],
  phone: "+48600123456",
  returningRate: 0.5,
  role: "customer",
  roleBadgeKey: "roleCustomer",
  stripeCustomerId: null,
  tags: ["verified"],
  timeline: [],
  timezone: null,
  totalSpent: 74_700,
  twoFactorEnabled: false,
  updatedAt: JOINED_AT,
})

const onDismiss = vi.fn<() => void>()

const onSuccess = vi.fn<() => void>()

const renderProvider = (open: boolean) =>
  renderWithProviders(
    <CustomerFormProvider customer={customerDetail()} onDismiss={onDismiss} onSuccess={onSuccess} open={open}>
      <CustomerForm>
        <CustomerFormSections />
      </CustomerForm>
    </CustomerFormProvider>,
  )

const renderWithoutTagField = () =>
  renderWithProviders(
    <CustomerFormProvider customer={customerDetail()} onDismiss={onDismiss} onSuccess={onSuccess} open>
      <CustomerForm>
        <button type="submit">Save changes</button>
      </CustomerForm>
    </CustomerFormProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  updateCustomer.mockResolvedValue({ ok: true })
})

afterEach(() => {
  cleanup()
})

describe("CustomerFormProvider closed", () => {
  it("holds blank fields while the sheet is closed instead of the customer's saved details", () => {
    renderProvider(false)

    expect(screen.getByPlaceholderText("+48 123 456 789")).toHaveValue("")
    expect(screen.getByPlaceholderText("PL")).toHaveValue("")
    expect(screen.queryByDisplayValue("ul. Mokotowska 12/4")).not.toBeInTheDocument()
  })

  it("starts with no custom tags while the sheet is closed", () => {
    renderProvider(false)

    expect(screen.getByText("0/20")).toBeInTheDocument()
    expect(screen.queryByText("vip")).not.toBeInTheDocument()
  })

  it("loads the saved details once the sheet is opened", () => {
    renderProvider(true)

    expect(screen.getByPlaceholderText("+48 123 456 789")).toHaveValue("+48600123456")
    expect(screen.getByText("1/20")).toBeInTheDocument()
  })
})

describe("CustomerFormProvider submitting without a tag field", () => {
  it("saves the customer even though nothing registered a pending tag to commit", async () => {
    renderWithoutTagField()

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await vi.waitFor(() => {
      expect(updateCustomer.mock.calls[0]?.[0]).toStrictEqual({
        id: "usr_1",
        values: {
          address: {
            address1: "ul. Mokotowska 12/4",
            city: "Warszawa",
            countryCode: "PL",
            postalCode: "00-640",
          },
          customTags: ["vip"],
          notes: "Prefers pickup at the atelier.",
          phone: "+48600123456",
        },
      })
    })
  })

  it("tells the admin the save went through", async () => {
    renderWithoutTagField()

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await vi.waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Customer updated", { description: "Changes were saved successfully." })
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})

describe("useCustomerForm", () => {
  it("refuses to hand out context outside the provider", () => {
    expect(() => renderWithProviders(<CustomerForm>fields</CustomerForm>)).toThrow(
      "useCustomerForm must be used within CustomerFormProvider",
    )
  })
})
