import { act, cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { toastError, toastSuccess, updateCustomer } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateCustomer: vi.fn<(input: { id: string; values: Record<string, unknown> }) => Promise<{ ok: true }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock("~/src/modules/user/use-cases/update-customer", () => ({
  updateCustomerMutation: { mutationFn: updateCustomer, mutationKey: ["user", "update-customer"] },
}))

import { type User } from "~/src/modules/user/user.types"

import { CustomerSheet } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-sheet"

const JOINED_AT = new Date("2026-01-15T10:00:00.000Z")

const customerDetail = (overrides: Partial<User["adminCustomerDetail"]> = {}): User["adminCustomerDetail"] => ({
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
  tags: ["verified", "returning"],
  timeline: [],
  timezone: null,
  totalSpent: 74_700,
  twoFactorEnabled: false,
  updatedAt: JOINED_AT,
  ...overrides,
})

const onOpenChange = vi.fn<(open: boolean) => void>()

const renderSheet = (customer: User["adminCustomerDetail"] = customerDetail()) =>
  renderWithProviders(<CustomerSheet customer={customer} open onOpenChange={onOpenChange} />)

const tagInput = () => screen.getByPlaceholderText("Add a tag…")

const customTagList = () => screen.getByText("vip").parentElement?.parentElement

beforeEach(() => {
  vi.clearAllMocks()
  updateCustomer.mockResolvedValue({ ok: true })
})

afterEach(() => {
  cleanup()
})

describe("CustomerSheet", () => {
  it("titles the sheet and explains what can be edited", () => {
    renderSheet()

    expect(screen.getByText("Edit customer")).toBeInTheDocument()
    expect(screen.getByText("Update contact details, default address, internal notes, and custom tags.")).toBeInTheDocument()
  })

  it("loads the customer's saved contact, address and notes into the form", () => {
    renderSheet()

    expect(screen.getByDisplayValue("+48600123456")).toBeInTheDocument()
    expect(screen.getByDisplayValue("ul. Mokotowska 12/4")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Warszawa")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Prefers pickup at the atelier.")).toBeInTheDocument()
  })

  it("lists the automatic tags as translated read-only badges", () => {
    renderSheet()

    expect(screen.getByText("System tags")).toBeInTheDocument()
    expect(screen.getByText("Verified")).toBeInTheDocument()
    expect(screen.getByText("Returning")).toBeInTheDocument()
  })

  it("hides the system tag block for a customer with no automatic tags", () => {
    renderSheet(customerDetail({ tags: [] }))

    expect(screen.queryByText("System tags")).not.toBeInTheDocument()
  })

  it("counts the custom tags against the limit", () => {
    renderSheet()

    expect(screen.getByText("1/20")).toBeInTheDocument()
  })

  it("closes the sheet when the admin cancels", async () => {
    renderSheet()

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe("CustomerSheet custom tags", () => {
  it("adds a typed tag when the add button is pressed", async () => {
    renderSheet()

    await userEvent.type(tagInput(), "wholesale")
    await userEvent.click(screen.getByRole("button", { name: "Add tag" }))

    expect(screen.getByText("wholesale")).toBeInTheDocument()
    expect(screen.getByText("2/20")).toBeInTheDocument()
    expect(tagInput()).toHaveValue("")
  })

  it("adds a tag when Enter is pressed instead of clicking", async () => {
    renderSheet()

    await userEvent.type(tagInput(), "press{Enter}")

    expect(screen.getByText("press")).toBeInTheDocument()
  })

  it("splits a comma or semicolon separated entry into several tags", async () => {
    renderSheet()

    await userEvent.type(tagInput(), "gift , express; vip{Enter}")

    expect(screen.getByText("gift")).toBeInTheDocument()
    expect(screen.getByText("express")).toBeInTheDocument()
    expect(screen.getByText("3/20")).toBeInTheDocument()
  })

  it("ignores a tag the customer already carries", async () => {
    renderSheet()

    await userEvent.type(tagInput(), "vip{Enter}")

    expect(screen.getByText("1/20")).toBeInTheDocument()
  })

  it("ignores blank input", async () => {
    renderSheet()

    await userEvent.type(tagInput(), "   {Enter}")

    expect(screen.getByText("1/20")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add tag" })).toBeDisabled()
  })

  it("removes a tag through its labelled remove button", async () => {
    renderSheet()

    await userEvent.click(screen.getByRole("button", { name: "Remove tag vip" }))

    expect(screen.queryByText("vip")).not.toBeInTheDocument()
    expect(screen.getByText("0/20")).toBeInTheDocument()
  })

  it("stops accepting tags once the limit is reached", () => {
    const tags = Array.from({ length: 20 }, (_, index) => `tag-${index}`)
    renderSheet(customerDetail({ customTags: tags }))

    expect(screen.getByText("20/20")).toBeInTheDocument()
    expect(tagInput()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Add tag" })).toBeDisabled()
  })
})

describe("CustomerSheet saving", () => {
  it("saves the edited customer and confirms it", async () => {
    renderSheet()

    await userEvent.clear(screen.getByDisplayValue("+48600123456"))
    await userEvent.type(screen.getByPlaceholderText("+48 123 456 789"), "+48601000000")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await vi.waitFor(() => {
      expect(updateCustomer.mock.calls[0]?.[0]).toStrictEqual({
        id: "usr_1",
        values: {
          address: {
            address1: "ul. Mokotowska 12/4",
            address2: undefined,
            city: "Warszawa",
            countryCode: "PL",
            postalCode: "00-640",
            province: undefined,
          },
          customTags: ["vip"],
          notes: "Prefers pickup at the atelier.",
          phone: "+48601000000",
        },
      })
    })
    await vi.waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Customer updated", { description: "Changes were saved successfully." })
    })
  })

  it("upper cases the country code the admin types", async () => {
    renderSheet()

    const country = screen.getByPlaceholderText("PL")
    await userEvent.clear(country)
    await userEvent.type(country, "de")

    expect(country).toHaveValue("DE")
  })

  it("saves the upper cased country code", async () => {
    renderSheet()

    const country = screen.getByPlaceholderText("PL")
    await userEvent.clear(country)
    await userEvent.type(country, "de")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await vi.waitFor(() => {
      expect(updateCustomer.mock.calls[0]?.[0]?.values["address"]).toMatchObject({ countryCode: "DE" })
    })
  })

  it("commits a tag still sitting in the input when the form is submitted", async () => {
    renderSheet()

    await userEvent.type(tagInput(), "pending-tag")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await vi.waitFor(() => {
      expect(updateCustomer.mock.calls[0]?.[0]?.values["customTags"]).toStrictEqual(["vip", "pending-tag"])
    })
  })

  it("reports a failed save instead of closing the sheet", async () => {
    updateCustomer.mockRejectedValue(new Error("network"))
    renderSheet()

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await vi.waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save customer", { description: "Please check the form and try again." })
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("keeps the custom tags and the system tags in separate groups", () => {
    renderSheet()

    expect(within(customTagList() ?? screen.getByText("vip")).getByRole("button", { name: "Remove tag vip" })).toBeInTheDocument()
  })
})

it("disables save and cancel until a pending customer update completes", async () => {
  const deferred = Promise.withResolvers<{ ok: true }>()
  updateCustomer.mockReturnValue(deferred.promise)
  renderSheet()
  const save = screen.getByRole("button", { name: "Save changes" })
  const cancel = screen.getByRole("button", { name: "Cancel" })

  await userEvent.click(save)
  await waitFor(() => {
    expect(save).toBeDisabled()
  })
  expect(cancel).toBeDisabled()
  expect(save.querySelector("svg")).toHaveClass("animate-spin")
  await userEvent.click(cancel)
  expect(onOpenChange).not.toHaveBeenCalled()

  await act(async () => {
    deferred.resolve({ ok: true })
    await deferred.promise
  })
  await waitFor(() => {
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  expect(updateCustomer).toHaveBeenCalledTimes(1)
  expect(toastSuccess).toHaveBeenCalled()
})
