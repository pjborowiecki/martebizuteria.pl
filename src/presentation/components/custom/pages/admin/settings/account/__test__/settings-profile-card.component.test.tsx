import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const mocks = vi.hoisted(() => ({
  emailDialog: vi.fn<(props: { currentEmail: string; hasPassword: boolean; open: boolean; variant?: string }) => void>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  updatePhone: vi.fn<(input: { phone: string }) => Promise<boolean>>(),
  updateUser: vi.fn<(input: { name: string }) => Promise<{ error?: { message: string } | null }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { updateUser: mocks.updateUser } }))
vi.mock("~/src/modules/customer-account/use-cases/update-customer-phone", () => ({
  updateCustomerPhoneMutation: { mutationFn: mocks.updatePhone, mutationKey: ["customerAccount", "updatePhone"] },
}))
vi.mock("~/src/modules/customer-account/use-cases/get-customer-profile", () => ({
  getCustomerProfileQuery: () => ({
    queryFn: () => Promise.reject(new Error("the profile is seeded by the test")),
    queryKey: ["customer-account", "profile"],
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/change-email-dialog", () => ({
  ChangeEmailDialog: (props: { currentEmail: string; hasPassword: boolean; open: boolean; variant?: string }): JSX.Element | null => {
    mocks.emailDialog(props)

    return props.open ? <div role="dialog">change email for {props.currentEmail}</div> : null
  },
}))

const { SettingsProfileCard } = await import("~/src/presentation/components/custom/pages/admin/settings/account/settings-profile-card")

const PROFILE: CustomerAccount["profile"] = {
  createdAt: new Date("2024-01-10T12:00:00.000Z"),
  email: "owner@marte.test",
  emailVerified: true,
  hasGoogle: false,
  hasPassword: true,
  name: "Anna Kowalska",
  phone: undefined,
  twoFactorEnabled: true,
}

const renderCard = (profile: CustomerAccount["profile"] = PROFILE) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE, profile)

  return renderWithProviders(<SettingsProfileCard />, { queryClient })
}

const user = () => userEvent.setup({ delay: null })

const openSheet = async (): Promise<HTMLElement> => {
  await user().click(screen.getByRole("button", { name: "Edit profile" }))

  return screen.findByRole("dialog", { name: "Edit profile" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateUser.mockResolvedValue({ error: null })
  mocks.updatePhone.mockResolvedValue(true)
})

afterEach(cleanup)

describe("SettingsProfileCard", () => {
  it("lists the admin's name, email, phone and the day the account was created", () => {
    renderCard()

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("owner@marte.test")).toBeInTheDocument()
    expect(screen.getByText("Not given")).toBeInTheDocument()
    expect(screen.getByText("January 10, 2024")).toBeInTheDocument()
    expect(screen.queryByText("Not confirmed")).not.toBeInTheDocument()
  })

  it("flags an email address that is not confirmed yet", () => {
    renderCard({ ...PROFILE, emailVerified: false, phone: "+48600123456" })

    expect(screen.getByText("Not confirmed")).toBeInTheDocument()
    expect(screen.getByText("+48600123456")).toBeInTheDocument()
  })

  it("opens the email change in the admin's dialog style", async () => {
    renderCard()

    await user().click(screen.getByRole("button", { name: "Change email" }))

    expect(screen.getByRole("dialog")).toHaveTextContent("change email for owner@marte.test")
    expect(mocks.emailDialog).toHaveBeenLastCalledWith(expect.objectContaining({ hasPassword: true, open: true, variant: "default" }))
  })

  it("tells the email change when the admin signs in with Google only, so it asks for no password", async () => {
    renderCard({ ...PROFILE, hasGoogle: true, hasPassword: false })

    await user().click(screen.getByRole("button", { name: "Change email" }))

    expect(mocks.emailDialog).toHaveBeenLastCalledWith(expect.objectContaining({ hasPassword: false, open: true }))
  })

  it("saves a new name from the profile sheet, refreshes the profile and the session, and closes", async () => {
    const { queryClient } = renderCard()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const sheet = await openSheet()
    const field = within(sheet).getByLabelText("Full name")

    fireEvent.change(field, { target: { value: "  Anna Nowak  " } })
    expect(within(sheet).getByText("14/120")).toBeInTheDocument()
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ name: "Anna Nowak" })
    })
    expect(mocks.updatePhone).not.toHaveBeenCalled()
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Profile saved.")
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["session", "current"] })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("explains an empty name instead of saving it", async () => {
    renderCard()
    const sheet = await openSheet()

    fireEvent.change(within(sheet).getByLabelText("Full name"), { target: { value: "" } })
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    expect(await within(sheet).findByText("Please enter your name.")).toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it("keeps the sheet open and says so when the name cannot be saved", async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: "nope" } })
    renderCard()
    const sheet = await openSheet()

    fireEvent.change(within(sheet).getByLabelText("Full name"), { target: { value: "Anna Nowak" } })
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Could not save the profile. Try again.")
    })
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument()
  })

  it("saves a new phone number alone and reports a refused one", async () => {
    renderCard()
    const sheet = await openSheet()

    fireEvent.change(within(sheet).getByLabelText("Phone number"), { target: { value: "+48600123456" } })
    expect(within(sheet).getByText("12/32")).toBeInTheDocument()
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.updatePhone.mock.calls[0]?.[0]).toStrictEqual({ phone: "+48600123456" })
    })
    expect(mocks.updateUser).not.toHaveBeenCalled()

    mocks.updatePhone.mockRejectedValue(new Error("refused"))
    const again = await openSheet()
    fireEvent.change(within(again).getByLabelText("Phone number"), { target: { value: "+48600999999" } })
    await user().click(within(again).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Could not save the profile. Try again.")
    })
  })

  it("saves an unchanged stored phone number as it is", async () => {
    renderCard({ ...PROFILE, phone: "+48600123456" })
    const sheet = await openSheet()

    expect(within(sheet).getByLabelText("Phone number")).toHaveValue("+48600123456")
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Profile saved.")
    })
    expect(mocks.updatePhone).not.toHaveBeenCalled()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it("leaves the stored values untouched when editing is cancelled", async () => {
    renderCard()
    const sheet = await openSheet()

    fireEvent.change(within(sheet).getByLabelText("Full name"), { target: { value: "Anna extra" } })
    await user().click(within(sheet).getByRole("button", { name: "Cancel" }))

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })
})
