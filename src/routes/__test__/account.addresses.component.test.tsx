import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const calls = vi.hoisted(() => ({
  create: vi.fn<(input: { data: Record<string, unknown> }) => Promise<unknown>>(),
  remove: vi.fn<(input: { data: { addressId: string } }) => Promise<unknown>>(),
  setDefault: vi.fn<(input: { data: { addressId: string } }) => Promise<unknown>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  update: vi.fn<(input: { data: Record<string, unknown> }) => Promise<unknown>>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/modules/address/use-cases/create-user-address", () => ({ createUserAddress: calls.create }))
vi.mock("~/src/modules/address/use-cases/update-user-address", () => ({ updateUserAddress: calls.update }))
vi.mock("~/src/modules/address/use-cases/delete-user-address", () => ({
  deleteUserAddressMutation: { mutationFn: calls.remove, mutationKey: ["address", "deleteUserAddress"] },
}))
vi.mock("~/src/modules/address/use-cases/set-default-user-address", () => ({
  setDefaultUserAddressMutation: { mutationFn: calls.setDefault, mutationKey: ["address", "setDefaultUserAddress"] },
}))
vi.mock("~/src/modules/address/use-cases/list-user-addresses", () => ({
  listUserAddressesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["userAddresses"] }),
}))

import { ADDRESS_QUERY_KEYS } from "~/src/modules/address/address.constants"
import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { Route } from "~/src/routes/account.addresses"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const addressRow = (overrides: Partial<CustomerAccount["address"]> = {}): CustomerAccount["address"] => ({
  address1: "Kwiatowa 12",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  createdAt: EPOCH,
  firstName: "Anna",
  id: "address-1",
  isDefault: true,
  lastName: "Kowalska",
  phone: "+48 600 100 200",
  postalCode: "00-001",
  province: null,
  updatedAt: EPOCH,
  userId: "user-1",
  ...overrides,
})

const AddressesPage = (): JSX.Element => {
  const { component: Component } = Route.options
  if (Component === undefined) {
    throw new Error("the addresses route has no component")
  }

  return <Component />
}

const renderPage = (addresses: readonly CustomerAccount["address"][]) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(ADDRESS_QUERY_KEYS.ALL, [...addresses])

  return renderWithProviders(<AddressesPage />, { queryClient })
}

const fieldInput = (label: string): HTMLElement => {
  const input = screen.getByText(label).parentElement?.querySelector("input")
  if (input === null || input === undefined) {
    throw new Error(`expected an input beside the ${label} label`)
  }

  return input
}

const card = (street = "Kwiatowa 12"): HTMLElement => {
  const node = screen.getByText(street).closest("div.group")
  if (node === null || !(node instanceof HTMLElement)) {
    throw new Error("expected an address card")
  }

  return node
}

const cardButtons = (): HTMLElement[] => within(card()).getAllByRole("button")

const lastCardButton = (): HTMLElement => {
  const button = cardButtons().at(-1)
  if (button === undefined) {
    throw new Error("expected a control on the address card")
  }

  return button
}

const fill = async (label: string, value: string): Promise<void> => {
  const field = fieldInput(label)
  await userEvent.clear(field)
  await userEvent.type(field, value)
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.create.mockResolvedValue({ ok: true })
  calls.update.mockResolvedValue({ ok: true })
  calls.remove.mockResolvedValue({ ok: true })
  calls.setDefault.mockResolvedValue({ ok: true })
})

afterEach(cleanup)

describe("the addresses page header", () => {
  it("titles the address book", () => {
    renderPage([])

    expect(screen.getByRole("heading", { level: 1, name: "Addresses" })).toBeInTheDocument()
    expect(screen.getByText("Address Book")).toBeInTheDocument()
  })

  it("counts the saved addresses next to the section heading", () => {
    renderPage([addressRow(), addressRow({ id: "address-2", isDefault: false })])

    expect(screen.getByText("Saved addresses (2)")).toBeInTheDocument()
  })

  it("says the book is empty when nothing is saved", () => {
    renderPage([])

    expect(screen.getByText("No saved addresses yet.")).toBeInTheDocument()
  })
})

describe("an address card", () => {
  it("omits the recipient line when no name was supplied", () => {
    renderPage([addressRow({ firstName: null, lastName: null })])

    expect(card()).not.toHaveTextContent("Anna Kowalska")
    expect(within(card()).getByText("Kwiatowa 12")).toBeInTheDocument()
  })

  it("prints the recipient, street, town and country", () => {
    renderPage([addressRow()])

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("Kwiatowa 12")).toBeInTheDocument()
    expect(screen.getByText("00-001 Warszawa")).toBeInTheDocument()
    expect(screen.getByText("PL")).toBeInTheDocument()
    expect(screen.getByText("+48 600 100 200")).toBeInTheDocument()
  })

  it("leaves out the second line and the phone when the address has none", () => {
    renderPage([addressRow({ address2: null, phone: null })])

    expect(screen.queryByText("+48 600 100 200")).not.toBeInTheDocument()
  })

  it("prints a second address line when there is one", () => {
    renderPage([addressRow({ address2: "m. 4" })])

    expect(screen.getByText("m. 4")).toBeInTheDocument()
  })

  it("marks the default address instead of offering to promote it", () => {
    renderPage([addressRow()])

    expect(screen.getByText("Default")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Make default" })).not.toBeInTheDocument()
  })

  it("offers to promote a secondary address", async () => {
    renderPage([addressRow({ id: "address-2", isDefault: false })])

    await userEvent.click(screen.getByRole("button", { name: "Make default" }))

    expect(calls.setDefault.mock.calls[0]?.[0]).toStrictEqual({ addressId: "address-2" })
  })

  it("deletes a secondary address", async () => {
    renderPage([addressRow({ id: "address-2", isDefault: false })])
    await userEvent.click(lastCardButton())

    expect(calls.remove.mock.calls[0]?.[0]).toStrictEqual({ addressId: "address-2" })
  })

  it("reports a failed delete to the shopper", async () => {
    calls.remove.mockRejectedValueOnce(new Error("nope"))
    renderPage([addressRow({ id: "address-2", isDefault: false })])
    await userEvent.click(lastCardButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("Could not delete address.")
    })
  })

  it("keeps the default address undeletable", () => {
    renderPage([addressRow()])

    expect(cardButtons()).toHaveLength(1)
  })

  it("offers promote, edit and delete on a secondary address", () => {
    renderPage([addressRow({ id: "address-2", isDefault: false })])

    expect(cardButtons()).toHaveLength(3)
  })
})

describe("saving an address", () => {
  it("makes a new address default when the cached address list was evicted", async () => {
    const { queryClient } = renderPage([])
    await userEvent.click(screen.getByRole("button", { name: "Add New" }))
    await fill("Street Address", "Nowa 5")
    queryClient.removeQueries({ exact: true, queryKey: ADDRESS_QUERY_KEYS.ALL })

    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.create.mock.calls[0]?.[0]?.data).toMatchObject({ isDefault: true })
    })
  })

  it("creates the first address as the default one", async () => {
    renderPage([])

    await userEvent.click(screen.getByRole("button", { name: "Add New" }))
    await fill("Street Address", "Nowa 5")
    await fill("City", "Krakow")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.create).toHaveBeenCalled()
    })
    expect(calls.create.mock.calls[0]?.[0]?.data).toMatchObject({
      address1: "Nowa 5",
      city: "Krakow",
      countryCode: "PL",
      isDefault: true,
    })
  })

  it("does not make a further address the default one", async () => {
    renderPage([addressRow()])

    await userEvent.click(screen.getByRole("button", { name: "Add New" }))
    await fill("Street Address", "Nowa 5")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.create).toHaveBeenCalled()
    })
    expect(calls.create.mock.calls[0]?.[0]?.data).toMatchObject({ isDefault: false })
  })

  it("drops the optional fields the shopper left blank", async () => {
    renderPage([])

    await userEvent.click(screen.getByRole("button", { name: "Add New" }))
    await fill("Street Address", "Nowa 5")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.create).toHaveBeenCalled()
    })
    expect(calls.create.mock.calls[0]?.[0]?.data).toMatchObject({
      address2: undefined,
      firstName: undefined,
      lastName: undefined,
      phone: undefined,
      postalCode: undefined,
      province: undefined,
    })
  })

  it("confirms a saved address", async () => {
    renderPage([])

    await userEvent.click(screen.getByRole("button", { name: "Add New" }))
    await fill("Street Address", "Nowa 5")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledWith("Address saved.")
    })
  })

  it("reports a failed save to the shopper", async () => {
    calls.create.mockRejectedValueOnce(new Error("nope"))
    renderPage([])

    await userEvent.click(screen.getByRole("button", { name: "Add New" }))
    await fill("Street Address", "Nowa 5")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("Could not save address.")
    })
  })

  it("limits the country field to a two letter code", async () => {
    renderPage([])

    await userEvent.click(screen.getByRole("button", { name: "Add New" }))

    expect(fieldInput("Country")).toHaveAttribute("maxlength", "2")
  })
})

describe("editing an address", () => {
  it("fills missing phone and postal fields while preserving a stored province", async () => {
    renderPage([addressRow({ address2: "m. 4", phone: null, postalCode: null, province: "Mazowieckie" })])

    await userEvent.click(screen.getByRole("button", { name: "Edit address" }))
    expect(fieldInput("Phone Number")).toHaveValue("")
    expect(fieldInput("Postal Code")).toHaveValue("")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.update.mock.calls[0]?.[0]?.data).toMatchObject({ address2: "m. 4", province: "Mazowieckie" })
    })
  })

  it("loads the stored address into the form", async () => {
    renderPage([addressRow()])

    await userEvent.click(screen.getByRole("button", { name: "Edit address" }))

    expect(fieldInput("Full Name")).toHaveValue("Anna Kowalska")
    expect(fieldInput("Street Address")).toHaveValue("Kwiatowa 12")
    expect(fieldInput("City")).toHaveValue("Warszawa")
    expect(fieldInput("Postal Code")).toHaveValue("00-001")
    expect(fieldInput("Country")).toHaveValue("PL")
    expect(fieldInput("Phone Number")).toHaveValue("+48 600 100 200")
  })

  it("keeps the fields the shopper did not retype", async () => {
    renderPage([addressRow()])
    await userEvent.click(screen.getByRole("button", { name: "Edit address" }))
    await fill("City", "Gdansk")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.update).toHaveBeenCalled()
    })
    expect(calls.update.mock.calls[0]?.[0]?.data).toMatchObject({
      address1: "Kwiatowa 12",
      addressId: "address-1",
      city: "Gdansk",
      firstName: "Anna",
      lastName: "Kowalska",
      phone: "+48 600 100 200",
      postalCode: "00-001",
    })
  })

  it("splits the typed recipient name across the stored first and last name", async () => {
    renderPage([addressRow()])
    await userEvent.click(screen.getByRole("button", { name: "Edit address" }))
    await fill("Full Name", "Maria Anna Nowak")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.update).toHaveBeenCalled()
    })
    expect(calls.update.mock.calls[0]?.[0]?.data).toMatchObject({ firstName: "Maria", lastName: "Anna Nowak" })
  })

  it("starts a new address from a blank form after an edit", async () => {
    renderPage([addressRow()])
    await userEvent.click(screen.getByRole("button", { name: "Edit address" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await userEvent.click(screen.getByRole("button", { name: "Add New" }))

    expect(fieldInput("Street Address")).toHaveValue("")
    expect(fieldInput("City")).toHaveValue("")
  })

  it("updates the stored address rather than creating another one", async () => {
    renderPage([addressRow()])
    await userEvent.click(lastCardButton())
    await fill("City", "Gdansk")
    await userEvent.click(screen.getByRole("button", { name: "Save Address" }))

    await waitFor(() => {
      expect(calls.update).toHaveBeenCalled()
    })
    expect(calls.create).not.toHaveBeenCalled()
    expect(calls.update.mock.calls[0]?.[0]?.data).toMatchObject({ addressId: "address-1", city: "Gdansk" })
  })
})

describe("the addresses route", () => {
  it("keeps the addresses for as long as the account queries stay fresh", () => {
    expect(Route.options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })
})

const onlyControl = (controls: readonly HTMLElement[], description: string): HTMLElement => {
  const control = controls.at(0)
  if (control === undefined) {
    throw new Error(`expected ${description}`)
  }

  return control
}

const deleteButtonOf = (street: string): HTMLElement => {
  const buttons = within(card(street)).getAllByRole("button")

  return onlyControl(buttons.slice(-1), `a delete control on the ${street} card`)
}

describe("an address that disappears while it is being edited", () => {
  it("keeps the open form as it was and admits the book is now empty", async () => {
    renderPage([addressRow(), addressRow({ address1: "Nowa 5", id: "address-2", isDefault: false })])
    await userEvent.click(onlyControl(screen.getAllByRole("button", { name: "Edit address" }), "an edit control on the first card"))

    expect(fieldInput("Street Address")).toHaveValue("Kwiatowa 12")

    await userEvent.click(deleteButtonOf("Nowa 5"))

    await waitFor(() => {
      expect(screen.getByText("No saved addresses yet.")).toBeInTheDocument()
    })
    expect(fieldInput("Street Address")).toHaveValue("Kwiatowa 12")
  })
})
