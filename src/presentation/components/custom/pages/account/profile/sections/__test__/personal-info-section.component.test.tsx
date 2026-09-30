import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const { toastError, toastSuccess, updatePhone, updateUser } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updatePhone: vi.fn<(input: { phone: string }) => Promise<boolean>>(),
  updateUser: vi.fn<(input: { name: string }) => Promise<{ error?: { message: string } }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { updateUser } }))
vi.mock("~/src/modules/customer-account/use-cases/update-customer-phone", () => ({
  updateCustomerPhoneMutation: { mutationFn: updatePhone, mutationKey: ["customerAccount", "updatePhone"] },
}))

const { PersonalInfoSection } = await import("~/src/presentation/components/custom/pages/account/profile/sections/personal-info-section")

const nth = (elements: readonly HTMLElement[], index: number): HTMLElement => {
  const element = elements[index]
  if (element === undefined) {
    throw new Error(`the profile section rendered no element at index ${index}`)
  }

  return element
}

const profile: CustomerAccount["profile"] = {
  createdAt: new Date("2024-01-10T00:00:00.000Z"),
  email: "anna@example.com",
  name: "Anna Kowalska",
  phone: "+48600123456",
}

beforeEach(() => {
  vi.clearAllMocks()
  updateUser.mockResolvedValue({})
  updatePhone.mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
})

describe("PersonalInfoSection layout", () => {
  it("reports the failure copy instead of the form when the profile could not be read", () => {
    renderWithProviders(<PersonalInfoSection profile={undefined} />)

    expect(screen.getByText("Could not update profile.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  })

  it("heads the section with the translated personal information title", () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Personal Information")
  })

  it("fills the fields with the profile it was given", () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)

    expect(screen.getByDisplayValue("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByDisplayValue("anna@example.com")).toBeInTheDocument()
    expect(screen.getByDisplayValue("+48600123456")).toBeInTheDocument()
  })

  it("labels the three rows", () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)

    expect(screen.getByText("Full name")).toBeInTheDocument()
    expect(screen.getByText("Email Address")).toBeInTheDocument()
    expect(screen.getByText("Phone Number")).toBeInTheDocument()
  })

  it("starts with every field read only and no way to edit the email", () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)

    expect(screen.getByDisplayValue("Anna Kowalska")).toHaveAttribute("readonly")
    expect(screen.getByDisplayValue("anna@example.com")).toHaveAttribute("readonly")
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("leaves a profile without a phone number empty", () => {
    renderWithProviders(<PersonalInfoSection profile={{ ...profile, phone: undefined }} />)

    expect(screen.getByDisplayValue("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getAllByRole("textbox")[2]).toHaveValue("")
  })
})

describe("PersonalInfoSection editing", () => {
  it("opens one field at a time for editing", async () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)

    await userEvent.click(nth(screen.getAllByRole("button"), 0))

    expect(screen.getByDisplayValue("Anna Kowalska")).not.toHaveAttribute("readonly")
    expect(screen.getByDisplayValue("+48600123456")).toHaveAttribute("readonly")
    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("restores the stored value when the shopper cancels", async () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)
    await userEvent.click(nth(screen.getAllByRole("button"), 0))
    await userEvent.clear(screen.getByDisplayValue("Anna Kowalska"))
    await userEvent.type(nth(screen.getAllByRole("textbox"), 0), "Anna Nowak")

    await userEvent.click(nth(screen.getAllByRole("button"), 1))

    expect(screen.getByDisplayValue("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(2)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("saves a new name through the auth client and confirms it", async () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)
    await userEvent.click(nth(screen.getAllByRole("button"), 0))
    await userEvent.clear(screen.getByDisplayValue("Anna Kowalska"))
    await userEvent.type(nth(screen.getAllByRole("textbox"), 0), "Anna Nowak")

    await userEvent.click(nth(screen.getAllByRole("button"), 0))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ name: "Anna Nowak" })
    })
    expect(toastSuccess).toHaveBeenCalledWith("Profile updated.")
    expect(await screen.findByDisplayValue("Anna Nowak")).toHaveAttribute("readonly")
  })

  it("reports the failure the auth client returns and keeps the field open", async () => {
    updateUser.mockResolvedValue({ error: { message: "name rejected" } })
    renderWithProviders(<PersonalInfoSection profile={profile} />)
    await userEvent.click(nth(screen.getAllByRole("button"), 0))

    await userEvent.click(nth(screen.getAllByRole("button"), 0))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not update profile.")
    })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("Anna Kowalska")).not.toHaveAttribute("readonly")
  })

  it("refuses to save a name the profile schema rejects", async () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)
    await userEvent.click(nth(screen.getAllByRole("button"), 0))
    await userEvent.clear(screen.getByDisplayValue("Anna Kowalska"))

    await userEvent.click(nth(screen.getAllByRole("button"), 0))

    await waitFor(() => {
      expect(screen.getAllByRole("textbox")[0]).toHaveAttribute("aria-invalid", "true")
    })
    expect(updateUser).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})

describe("PersonalInfoSection phone", () => {
  it("saves the phone number through its own mutation and refreshes the profile", async () => {
    const { queryClient } = renderWithProviders(<PersonalInfoSection profile={profile} />)
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    await userEvent.click(nth(screen.getAllByRole("button"), 1))
    await userEvent.clear(screen.getByDisplayValue("+48600123456"))
    await userEvent.type(nth(screen.getAllByRole("textbox"), 2), "+48600999888")

    await userEvent.click(nth(screen.getAllByRole("button"), 1))

    await waitFor(() => {
      expect(updatePhone.mock.calls[0]?.[0]).toStrictEqual({ phone: "+48600999888" })
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })
    expect(toastSuccess).toHaveBeenCalledWith("Profile updated.")
  })

  it("keeps an emptied phone number allowed by the schema", async () => {
    renderWithProviders(<PersonalInfoSection profile={profile} />)
    await userEvent.click(nth(screen.getAllByRole("button"), 1))
    await userEvent.clear(screen.getByDisplayValue("+48600123456"))

    await userEvent.click(nth(screen.getAllByRole("button"), 1))

    await waitFor(() => {
      expect(updatePhone.mock.calls[0]?.[0]).toStrictEqual({ phone: "" })
    })
  })
})

describe("PersonalInfoSection phone failures", () => {
  it("reports a phone number the server refused and keeps the field open", async () => {
    updatePhone.mockRejectedValue(new Error("phone rejected"))
    renderWithProviders(<PersonalInfoSection profile={profile} />)
    await userEvent.click(nth(screen.getAllByRole("button"), 1))

    await userEvent.click(nth(screen.getAllByRole("button"), 1))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not update profile.")
    })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("+48600123456")).not.toHaveAttribute("readonly")
  })
})
