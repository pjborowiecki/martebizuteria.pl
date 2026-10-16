import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

const mocks = vi.hoisted(() => ({
  archive: vi.fn<(input: { archived: boolean; id: string }) => Promise<unknown>>(),
  create: vi.fn<(input: unknown) => Promise<unknown>>(),
  reorder: vi.fn<(ids: string[]) => Promise<unknown>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  update: vi.fn<(input: unknown) => Promise<unknown>>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/delivery-method/use-cases/list-admin-delivery-methods", () => ({
  listAdminDeliveryMethodsQuery: () => ({
    queryFn: () => Promise.reject(new Error("the delivery methods are seeded by the test")),
    queryKey: ["admin", "delivery-methods"],
  }),
}))
vi.mock("~/src/modules/delivery-method/use-cases/create-delivery-method", () => ({
  createDeliveryMethodMutation: { mutationFn: mocks.create, mutationKey: ["delivery-method", "create"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/update-delivery-method", () => ({
  updateDeliveryMethodMutation: { mutationFn: mocks.update, mutationKey: ["delivery-method", "update"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/archive-delivery-method", () => ({
  archiveDeliveryMethodMutation: { mutationFn: mocks.archive, mutationKey: ["delivery-method", "archive"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/reorder-delivery-methods", () => ({
  reorderDeliveryMethodsMutation: { mutationFn: mocks.reorder, mutationKey: ["delivery-method", "reorder"] },
}))

const { SettingsDeliveryMethodsCard } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/settings-delivery-methods-card")

const INPOST = { id: "019f4a10-0000-7000-8000-000000000001", internalCode: "inpost", isActive: true, name: "InPost" }

const ATELIER = { id: "019f4a10-0000-7000-8000-000000000002", internalCode: "marte-atelier", isActive: true, name: "M'ARTE Atelier" }

const UPDATED_AT = new Date("2026-10-16T12:00:00.000Z")

const method = (overrides: Partial<DeliveryMethod["adminMethod"]>): DeliveryMethod["adminMethod"] => ({
  archivedAt: undefined,
  courier: INPOST,
  id: "019f4a10-0001-7000-8000-000000000002",
  isActive: true,
  names: { "en-US": "InPost courier", "pl-PL": "Kurier InPost" },
  price: 1999,
  type: "courier",
  updatedAt: UPDATED_AT,
  ...overrides,
})

const COURIER = method({})

const LOCKER = method({
  id: "019f4a10-0001-7000-8000-000000000001",
  isActive: false,
  names: { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" },
  price: 1499,
  type: "locker",
})

const PICKUP = method({
  archivedAt: new Date("2026-10-01T00:00:00.000Z"),
  courier: ATELIER,
  id: "019f4a10-0001-7000-8000-000000000003",
  names: { "en-US": "Pickup at the atelier", "pl-PL": "Odbiór w atelier" },
  price: 0,
  type: "in_store",
})

const renderCard = (methods: readonly DeliveryMethod["adminMethod"][] = [COURIER, LOCKER, PICKUP]) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL, { couriers: [ATELIER, INPOST], methods })

  return renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <SettingsDeliveryMethodsCard />
    </Suspense>,
    { queryClient },
  )
}

const user = () => userEvent.setup({ delay: null })

const row = (name: string): HTMLElement => {
  const element = screen.getByText(name).closest("[data-slot=settings-row]")
  if (!(element instanceof HTMLElement)) {
    throw new Error(`no row for ${name}`)
  }

  return element
}

const openAdd = async () => {
  await user().click(screen.getByRole("button", { name: "Add method" }))

  return screen.findByRole("dialog", { name: "Add a delivery method" })
}

const openEdit = async () => {
  await user().click(within(row("InPost courier")).getByRole("button", { name: "Edit" }))

  return screen.findByRole("dialog", { name: "Edit InPost courier" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.archive.mockResolvedValue({ id: COURIER.id })
  mocks.create.mockResolvedValue({ id: "new" })
  mocks.reorder.mockResolvedValue({ ok: true })
  mocks.update.mockResolvedValue({ id: COURIER.id })
})

afterEach(cleanup)

describe("SettingsDeliveryMethodsCard list", () => {
  it("lists the offered methods with their type, carrier and price, and marks a hidden one", () => {
    renderCard()

    expect(within(row("InPost courier")).getByText("Courier · InPost")).toBeInTheDocument()
    expect(within(row("InPost courier")).getByText("PLN 19.99")).toBeInTheDocument()
    expect(within(row("InPost parcel locker")).getByText("Hidden")).toBeInTheDocument()
    expect(screen.getByText("Archived methods (1)")).toBeInTheDocument()
  })

  it("names a free method as free and says when its carrier is switched off", () => {
    renderCard([method({ courier: { ...INPOST, isActive: false }, price: 0 })])

    expect(within(row("InPost courier")).getByText("Free")).toBeInTheDocument()
    expect(within(row("InPost courier")).getByText("Carrier switched off")).toBeInTheDocument()
  })

  it("asks for a first method in a shop that has none", () => {
    renderCard([])

    expect(screen.getByText(/No delivery methods yet/u)).toBeInTheDocument()
  })

  it("moves a method down the checkout's list and keeps the first one from moving up", async () => {
    renderCard()

    expect(screen.getByRole("button", { name: "Move InPost courier up" })).toBeDisabled()
    await user().click(screen.getByRole("button", { name: "Move InPost courier down" }))

    await waitFor(() => {
      expect(mocks.reorder).toHaveBeenCalledWith([LOCKER.id, COURIER.id], expect.anything())
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Checkout order saved.")
  })

  it("moves a method up the checkout's list", async () => {
    renderCard()

    await user().click(screen.getByRole("button", { name: "Move InPost parcel locker up" }))

    await waitFor(() => {
      expect(mocks.reorder).toHaveBeenCalledWith([LOCKER.id, COURIER.id], expect.anything())
    })
  })

  it("restores an archived method", async () => {
    renderCard()

    await user().click(screen.getByText("Archived methods (1)"))
    await user().click(within(row("Pickup at the atelier")).getByRole("button", { name: "Restore" }))

    await waitFor(() => {
      expect(mocks.archive).toHaveBeenCalledWith({ archived: false, id: PICKUP.id }, expect.anything())
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Pickup at the atelier restored. Turn it on to offer it again.")
  })
})

describe("SettingsDeliveryMethodsCard adding a method", () => {
  it("points each missing field out instead of saving", async () => {
    renderCard()
    const dialog = await openAdd()

    await user().click(within(dialog).getByRole("button", { name: "Add method" }))

    expect(within(dialog).getAllByText("Enter a name.")).toHaveLength(2)
    expect(within(dialog).getByText("Enter a price of 0 or more.")).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("adds a courier method with a new carrier, warning that it ships by hand", async () => {
    renderCard()
    const dialog = await openAdd()

    await user().click(within(dialog).getByLabelText("Carrier"))
    await user().click(await screen.findByRole("option", { name: "New carrier" }))
    expect(within(dialog).getByText(/Only InPost parcels are booked from the order page/u)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText("Carrier name"), { target: { value: "DPD" } })
    fireEvent.change(within(dialog).getByLabelText("Name in Polish"), { target: { value: "Kurier DPD" } })
    fireEvent.change(within(dialog).getByLabelText("Name in English"), { target: { value: "DPD courier" } })
    fireEvent.change(within(dialog).getByLabelText("Price"), { target: { value: "18.99" } })
    await user().click(within(dialog).getByRole("button", { name: "Add method" }))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith(
        {
          courier: { name: "DPD" },
          isActive: true,
          names: { "en-US": "DPD courier", "pl-PL": "Kurier DPD" },
          price: 1899,
          type: "courier",
        },
        expect.anything(),
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Delivery method added.")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("keeps the form as it is when the admin picks the type and carrier already chosen", async () => {
    renderCard()
    const dialog = await openAdd()
    fireEvent.change(within(dialog).getByLabelText("Name in Polish"), { target: { value: "Kurier" } })

    await user().click(within(dialog).getByLabelText("Type"))
    await user().click(await screen.findByRole("option", { name: "Courier" }))
    await user().click(within(dialog).getByLabelText("Carrier"))
    await user().click(await screen.findByRole("option", { name: "InPost" }))

    expect(within(dialog).getByLabelText("Name in Polish")).toHaveValue("Kurier")
    expect(within(dialog).queryByLabelText("Carrier name")).not.toBeInTheDocument()
  })

  it("books a parcel locker method with InPost and says so", async () => {
    renderCard()
    const dialog = await openAdd()

    await user().click(within(dialog).getByLabelText("Type"))
    await user().click(await screen.findByRole("option", { name: "Parcel locker" }))

    expect(within(dialog).getByLabelText("Carrier")).toBeDisabled()
    expect(within(dialog).getByText(/Parcel lockers are InPost's/u)).toBeInTheDocument()
  })

  it("explains why the server refused the method", async () => {
    mocks.create.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, "DELIVERY_METHOD_TYPE_ALREADY_OFFERED"))
    renderCard()
    const dialog = await openAdd()
    fireEvent.change(within(dialog).getByLabelText("Name in Polish"), { target: { value: "Kurier" } })
    fireEvent.change(within(dialog).getByLabelText("Name in English"), { target: { value: "Courier" } })
    fireEvent.change(within(dialog).getByLabelText("Price"), { target: { value: "0" } })

    await user().click(within(dialog).getByRole("button", { name: "Add method" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining("one parcel locker method and one pickup method"))
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})

describe("SettingsDeliveryMethodsCard editing a method", () => {
  it("saves a new price and hides the method from the checkout", async () => {
    renderCard()
    const dialog = await openEdit()

    expect(within(dialog).getByText("Courier · InPost")).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText("Price"), { target: { value: "21.99" } })
    await user().click(within(dialog).getByRole("switch", { name: "Offer at checkout" }))
    await user().click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledWith(
        { expectedUpdatedAt: UPDATED_AT, id: COURIER.id, isActive: false, names: COURIER.names, price: 2199 },
        expect.anything(),
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Delivery method saved.")
  })

  it("tells the admin to reload when someone changed the method meanwhile", async () => {
    mocks.update.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    renderCard()
    const dialog = await openEdit()

    await user().click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Someone changed this method in the meantime. Reload the page to see the change.")
    })
  })

  it("archives the method once the admin confirms", async () => {
    renderCard()
    const dialog = await openEdit()

    await user().click(within(dialog).getByRole("button", { name: "Archive" }))
    const confirm = await screen.findByRole("alertdialog", { name: "Archive InPost courier?" })
    await user().click(within(confirm).getByRole("button", { name: "Archive" }))

    await waitFor(() => {
      expect(mocks.archive).toHaveBeenCalledWith({ archived: true, id: COURIER.id }, expect.anything())
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("InPost courier archived.")
  })

  it("asks for a price again once it was cleared", async () => {
    renderCard()
    const dialog = await openEdit()

    fireEvent.change(within(dialog).getByLabelText("Price"), { target: { value: "" } })
    await user().click(within(dialog).getByRole("button", { name: "Save" }))

    expect(within(dialog).getByText("Enter a price of 0 or more.")).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("reports an unexpected failure in general terms", async () => {
    mocks.update.mockRejectedValue(new Error("network down"))
    renderCard()
    const dialog = await openEdit()

    await user().click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Something went wrong. Please try again.")
    })
  })

  it("keeps the method when the admin backs out of archiving it", async () => {
    renderCard()
    const dialog = await openEdit()

    await user().click(within(dialog).getByRole("button", { name: "Archive" }))
    const confirm = await screen.findByRole("alertdialog", { name: "Archive InPost courier?" })
    await user().click(within(confirm).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
    expect(screen.getByRole("dialog", { name: "Edit InPost courier" })).toBeInTheDocument()
    expect(mocks.archive).not.toHaveBeenCalled()
  })

  it("stays open while a save is on its way", async () => {
    mocks.update.mockReturnValue(new Promise(() => {}))
    renderCard()
    const dialog = await openEdit()

    await user().click(within(dialog).getByRole("button", { name: "Save" }))
    await user().keyboard("{Escape}")

    expect(screen.getByRole("dialog", { name: "Edit InPost courier" })).toBeInTheDocument()
  })

  it("keeps the confirmation open while the archive is on its way", async () => {
    mocks.archive.mockReturnValue(new Promise(() => {}))
    renderCard()
    const dialog = await openEdit()

    await user().click(within(dialog).getByRole("button", { name: "Archive" }))
    const confirm = await screen.findByRole("alertdialog", { name: "Archive InPost courier?" })
    await user().click(within(confirm).getByRole("button", { name: "Archive" }))
    await user().keyboard("{Escape}")

    expect(screen.getByRole("alertdialog", { name: "Archive InPost courier?" })).toBeInTheDocument()
  })

  it("closes on Escape without saving", async () => {
    renderCard()
    await openEdit()

    await user().keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("closes without saving on cancel", async () => {
    renderCard()
    const dialog = await openEdit()

    await user().click(within(dialog).getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
