import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const mocks = vi.hoisted(() => ({
  emailDialog: vi.fn<(props: { currentEmail: string; open: boolean; variant?: string }) => void>(),
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
  ChangeEmailDialog: (props: { currentEmail: string; open: boolean; variant?: string }): JSX.Element | null => {
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

    await user().click(screen.getByRole("button", { name: "Change" }))

    expect(screen.getByRole("dialog")).toHaveTextContent("change email for owner@marte.test")
    expect(mocks.emailDialog).toHaveBeenLastCalledWith(expect.objectContaining({ open: true, variant: "default" }))
  })

  it("saves a new name, refreshes the profile and the session, and closes the field", async () => {
    const { queryClient } = renderCard()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const actor = user()

    await actor.click(screen.getAllByRole("button", { name: "Edit" })[0] ?? document.body)
    const field = screen.getByLabelText("Full name")
    await actor.clear(field)
    await actor.type(field, "  Anna Nowak  ")
    await actor.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ name: "Anna Nowak" })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Profile saved.")
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["session", "current"] })
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument()
  })

  it("explains an empty name instead of saving it", async () => {
    renderCard()
    const actor = user()

    await actor.click(screen.getAllByRole("button", { name: "Edit" })[0] ?? document.body)
    await actor.clear(screen.getByLabelText("Full name"))
    await actor.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Please enter your name.")).toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it("keeps the field open and says so when the name cannot be saved", async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: "nope" } })
    renderCard()
    const actor = user()

    await actor.click(screen.getAllByRole("button", { name: "Edit" })[0] ?? document.body)
    await actor.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Could not save the profile. Try again.")
    })
    expect(screen.getByLabelText("Full name")).toBeInTheDocument()
  })

  it("saves a phone number through the phone action and reports a refused one", async () => {
    renderCard()
    const actor = user()

    await actor.click(screen.getAllByRole("button", { name: "Edit" })[1] ?? document.body)
    await actor.type(screen.getByLabelText("Phone number"), "+48600123456")
    await actor.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.updatePhone.mock.calls[0]?.[0]).toStrictEqual({ phone: "+48600123456" })
    })

    mocks.updatePhone.mockRejectedValue(new Error("refused"))
    await actor.click(screen.getAllByRole("button", { name: "Edit" })[1] ?? document.body)
    await actor.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Could not save the profile. Try again.")
    })
  })

  it("leaves the stored value untouched when editing is cancelled", async () => {
    renderCard()
    const actor = user()

    await actor.click(screen.getAllByRole("button", { name: "Edit" })[0] ?? document.body)
    await actor.type(screen.getByLabelText("Full name"), " extra")
    await actor.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })
})
