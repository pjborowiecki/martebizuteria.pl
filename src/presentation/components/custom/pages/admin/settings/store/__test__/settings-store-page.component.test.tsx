import { type JSX, type ReactNode, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

const mocks = vi.hoisted(() => ({
  save: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", () => ({
  getAdminSellerDetailsQuery: () => ({
    queryFn: () => Promise.reject(new Error("the seller details are seeded by the test")),
    queryKey: ["admin", "store-setting", "seller-details"],
  }),
}))
vi.mock("~/src/integrations/resend/resend.shop-sender", () => ({
  getShopSenderQuery: () => ({
    queryFn: () => Promise.reject(new Error("the shop's sending address is seeded by the test")),
    queryKey: ["admin", "resend", "shop-sender"],
  }),
}))
vi.mock("~/src/modules/store-setting/use-cases/update-seller-details", () => ({
  updateSellerDetailsMutation: { mutationFn: mocks.save, mutationKey: ["store-setting", "updateSellerDetails"] },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({ actions, title }: Readonly<{ actions?: ReactNode; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}))

const { SettingsStorePage } = await import("~/src/presentation/components/custom/pages/admin/settings/store/settings-store-page")

const LOADED_AT = new Date("2026-10-16T12:00:00.000Z")

const SAVED_AT = new Date("2026-10-16T13:00:00.000Z")

const SENDER_ADDRESS = "hello@pjborowiecki.com"

const SELLER = {
  city: "Bochnia",
  countryCode: "PL",
  email: "kontakt@martebizuteria.pl",
  legalName: "Pyciak Mariusz Firma Jubilerska",
  nip: "8681772646",
  phone: "+48 663 150 820",
  postalCode: "32-700",
  regon: "384616568",
  street: "ul. Wąska 11",
}

const renderCard = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS, { ...SELLER, updatedAt: LOADED_AT })
  queryClient.setQueryData(STORE_SETTING_QUERY_KEYS.SELLER_DETAILS, { ...SELLER, updatedAt: LOADED_AT })
  queryClient.setQueryData(["admin", "resend", "shop-sender"], { address: SENDER_ADDRESS })
  const view = renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <SettingsStorePage />
    </Suspense>,
    { queryClient },
  )

  return { queryClient, view }
}

const user = () => userEvent.setup({ delay: null })

const save = () => user().click(screen.getByRole("button", { name: "Save" }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.save.mockImplementation((input) => Promise.resolve({ ...SELLER, ...input, updatedAt: SAVED_AT }))
})

afterEach(cleanup)

describe("SettingsStorePage", () => {
  it("shows the seller's stored details, with the country named in the admin's language", () => {
    renderCard()

    expect(screen.getByRole("heading", { name: "Seller details" })).toBeInTheDocument()
    expect(screen.getByText("31/200")).toBeInTheDocument()
    expect(screen.getByLabelText("Legal name")).toHaveValue(SELLER.legalName)
    expect(screen.getByLabelText("Street and number")).toHaveValue(SELLER.street)
    expect(screen.getByLabelText("Postal code")).toHaveValue(SELLER.postalCode)
    expect(screen.getByLabelText("City")).toHaveValue(SELLER.city)
    expect(screen.getByLabelText("Country")).toHaveTextContent("Poland")
    expect(screen.getByLabelText("NIP")).toHaveValue(SELLER.nip)
    expect(screen.getByLabelText("REGON")).toHaveValue(SELLER.regon)
    expect(screen.getByLabelText("Contact email")).toHaveValue(SELLER.email)
    expect(screen.getByLabelText("Contact phone")).toHaveValue(SELLER.phone)
  })

  it("explains that customers see the contact email and reply to it, and names the address the shop's emails are actually sent from", () => {
    renderCard()

    expect(
      screen.getByRole("button", {
        name: /^Customers see this address on the site and in the shop's emails, and their replies come here\. The emails themselves are sent from the shop's sending address, hello@pjborowiecki\.com, which this field does not change\./u,
      }),
    ).toBeInTheDocument()
  })

  it("saves the edited details with the time they were loaded, then refreshes the admin copy, drops the shop's and says so", async () => {
    const { queryClient } = renderCard()

    fireEvent.change(screen.getByLabelText("Street and number"), { target: { value: "ul. Floriańska 1" } })
    fireEvent.change(screen.getByLabelText("NIP"), { target: { value: "526-025-02-74" } })
    await save()

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Seller details saved.")
    })
    expect(mocks.save.mock.calls[0]?.[0]).toStrictEqual({
      ...SELLER,
      expectedUpdatedAt: LOADED_AT,
      nip: "5260250274",
      street: "ul. Floriańska 1",
    })
    expect(queryClient.getQueryState(STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(STORE_SETTING_QUERY_KEYS.SELLER_DETAILS)).toBeUndefined()
    expect(screen.getByLabelText("NIP")).toHaveValue("5260250274")
  })

  it("saves from the header, saying whether the details are saved, changed or on their way", async () => {
    const pending = Promise.withResolvers<unknown>()
    mocks.save.mockReturnValue(pending.promise)
    renderCard()

    expect(screen.getByText("Saved Oct 16, 2026, 2:00 PM")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-disabled", "true")

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kraków" } })

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument()

    await save()

    expect(screen.getByText("Saving…")).toBeInTheDocument()
    expect(screen.getByLabelText("City")).toBeDisabled()
    pending.resolve({ ...SELLER, city: "Kraków", updatedAt: SAVED_AT })
    expect(await screen.findByText("Saved Oct 16, 2026, 3:00 PM")).toBeInTheDocument()
  })

  it("sends the time of its own last save with the next one", async () => {
    renderCard()

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kraków" } })
    await save()
    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledOnce()
    })
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Bochnia" } })
    await save()

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledTimes(2)
    })
    expect(mocks.save.mock.calls[1]?.[0]).toMatchObject({ expectedUpdatedAt: SAVED_AT })
  })
})

describe("SettingsStorePage fields", () => {
  it("moves the seller to another country picked from the list", async () => {
    renderCard()

    await user().click(screen.getByLabelText("Country"))
    await user().click(await screen.findByRole("option", { name: "Germany" }))
    fireEvent.change(screen.getByLabelText("Postal code"), { target: { value: "10115" } })
    await save()

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledOnce()
    })
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({ countryCode: "DE", postalCode: "10115" })
  })

  it("keeps the details as they are when the admin picks the country already chosen", async () => {
    renderCard()
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kraków" } })

    await user().click(screen.getByLabelText("Country"))
    await user().click(await screen.findByRole("option", { name: "Poland" }))

    expect(screen.getByLabelText("City")).toHaveValue("Kraków")
    expect(screen.getByLabelText("Country")).toHaveTextContent("Poland")
  })

  it("marks every wrong field with its own message and saves nothing", async () => {
    renderCard()

    fireEvent.change(screen.getByLabelText("Legal name"), { target: { value: " " } })
    fireEvent.change(screen.getByLabelText("Postal code"), { target: { value: "32700" } })
    fireEvent.change(screen.getByLabelText("NIP"), { target: { value: "8681772647" } })
    fireEvent.change(screen.getByLabelText("Contact phone"), { target: { value: "663 150 820" } })
    await save()

    expect(screen.getByText("Enter the legal name.")).toBeInTheDocument()
    expect(screen.getByText("Enter a Polish postal code in the form 00-000.")).toBeInTheDocument()
    expect(screen.getByText("This NIP is not valid. Check its 10 digits.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid number with its country code, e.g. +48 600 000 000.")).toBeInTheDocument()
    expect(screen.getByLabelText("Legal name")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("REGON")).toHaveAttribute("aria-invalid", "false")
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it("clears the messages once the details are right", async () => {
    renderCard()

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "" } })
    await save()
    expect(screen.getByText("Enter the city.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kraków" } })
    await save()

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledOnce()
    })
    expect(screen.queryByText("Enter the city.")).not.toBeInTheDocument()
  })

  it("tells the admin to reload when someone else saved the details in the meantime", async () => {
    mocks.save.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    renderCard()
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kraków" } })

    await save()

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Someone changed the seller details in the meantime. Reload the page to see the change.",
      )
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it("tells the admin when saving fails for another reason", async () => {
    mocks.save.mockRejectedValue(new Error("network down"))
    renderCard()
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kraków" } })

    await save()

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Something went wrong. Please try again.")
    })
  })
})
