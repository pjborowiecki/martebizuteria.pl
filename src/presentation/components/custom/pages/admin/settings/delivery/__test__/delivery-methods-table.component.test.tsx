import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

import {
  COURIER,
  INPOST,
  LOCKER,
  PICKUP,
  bodyRows,
  deliveryMethod,
  methodRow,
  renderDelivery,
  showArchivedMethods,
  user,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/__test__/delivery-fixtures"

const mocks = vi.hoisted(() => ({
  archive: vi.fn<(input: { archived: boolean; id: string }) => Promise<unknown>>(),
  fetchFreeDelivery: vi.fn<() => Promise<unknown>>(),
  fetchMethods: vi.fn<() => Promise<unknown>>(),
  reorder: vi.fn<(ids: string[]) => Promise<unknown>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/delivery-method/use-cases/list-admin-delivery-methods", () => ({
  listAdminDeliveryMethodsQuery: () => ({
    queryFn: mocks.fetchMethods,
    queryKey: ["admin", "delivery-methods"],
  }),
}))
vi.mock("~/src/modules/store-setting/use-cases/get-free-delivery", () => ({
  getAdminFreeDeliveryQuery: () => ({
    queryFn: mocks.fetchFreeDelivery,
    queryKey: ["admin", "store-setting", "free-delivery"],
  }),
}))
vi.mock("~/src/modules/delivery-method/use-cases/archive-delivery-method", () => ({
  archiveDeliveryMethodMutation: { mutationFn: mocks.archive, mutationKey: ["delivery-method", "archive"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/create-delivery-method", () => ({
  createDeliveryMethodMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "create"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/update-delivery-method", () => ({
  updateDeliveryMethodMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "update"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/reorder-delivery-methods", () => ({
  reorderDeliveryMethodsMutation: { mutationFn: mocks.reorder, mutationKey: ["delivery-method", "reorder"] },
}))

const { DeliveryMethodsTable } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-table")

const handle = (name: string): HTMLElement => within(methodRow(name)).getByRole("button", { name: "Drag to reorder, or use arrow keys" })

const openRowMenu = async (name: string) => {
  await user().click(screen.getByRole("button", { name: `Actions for ${name}` }))

  return screen.findByRole("menu")
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchMethods.mockRejectedValue(new Error("the delivery methods are seeded by the test"))
  mocks.fetchFreeDelivery.mockRejectedValue(new Error("the threshold is seeded by the test"))
  mocks.archive.mockResolvedValue({ id: COURIER.id })
  mocks.reorder.mockResolvedValue({ ok: true })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("DeliveryMethodsTable list", () => {
  it("lists the current methods in checkout order with their type, carrier, price and status, leaving archived ones out", () => {
    renderDelivery(<DeliveryMethodsTable />)

    const [first, second] = bodyRows()
    expect(bodyRows()).toHaveLength(2)
    expect(first).toHaveTextContent("InPost courier")
    expect(first).toHaveTextContent("Courier")
    expect(first).toHaveTextContent("InPost")
    expect(first).toHaveTextContent("PLN 19.99")
    expect(first).toHaveTextContent("Offered")
    expect(second).toHaveTextContent("InPost parcel locker")
    expect(second).toHaveTextContent("Hidden")
    expect(screen.queryByText("Pickup at the atelier")).not.toBeInTheDocument()
  })

  it("lists only the archived methods, with their price and status, once the admin asks for them", async () => {
    renderDelivery(<DeliveryMethodsTable />)

    await showArchivedMethods()

    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent("Pickup at the atelier")
    expect(bodyRows()[0]).toHaveTextContent("Free")
    expect(bodyRows()[0]).toHaveTextContent("Archived")
    expect(handle("Pickup at the atelier")).toBeDisabled()
  })

  it("says when a method is hidden because its carrier is switched off", () => {
    renderDelivery(<DeliveryMethodsTable />, { methods: [deliveryMethod({ courier: { ...INPOST, isActive: false } })] })

    expect(methodRow("InPost courier")).toHaveTextContent("Carrier switched off")
  })

  it("shows the grid's empty state in a shop without methods", () => {
    renderDelivery(<DeliveryMethodsTable />, { methods: [] })

    expect(screen.getByText("No data to display")).toBeInTheDocument()
  })

  it("counts the offered, hidden and archived methods and shows the free delivery threshold", () => {
    renderDelivery(<DeliveryMethodsTable />, { threshold: 30_000 })

    expect(screen.getByRole("button", { name: /^Offered at checkout 1/u })).toHaveTextContent("33% of all")
    expect(screen.getByRole("button", { name: /^Hidden 1/u })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Archived 1/u })).toBeInTheDocument()
    expect(screen.getByText("PLN 300.00")).toBeInTheDocument()
    expect(screen.getByText("Products in the basket, after a discount code")).toBeInTheDocument()
  })

  it("reloads the methods and the threshold from the toolbar, showing both as loading meanwhile", async () => {
    mocks.fetchMethods.mockReturnValue(new Promise(() => {}))
    mocks.fetchFreeDelivery.mockReturnValue(new Promise(() => {}))
    renderDelivery(<DeliveryMethodsTable />)

    await user().click(screen.getByRole("button", { name: "Reload table data" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reload table data" })).toBeDisabled()
    })
    expect(mocks.fetchMethods).toHaveBeenCalledTimes(1)
    expect(mocks.fetchFreeDelivery).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: /^Hidden/u })).toHaveAttribute("aria-busy", "true")
  })

  it("shows when each method was last edited and its Polish name once the admin turns those columns on", async () => {
    renderDelivery(<DeliveryMethodsTable />)

    await user().click(screen.getByRole("button", { name: "Show or hide columns" }))
    await user().click(await screen.findByRole("menuitemcheckbox", { name: "Last edited" }))
    await user().click(await screen.findByRole("menuitemcheckbox", { name: "Method (PL)" }))

    expect(methodRow("InPost courier")).toHaveTextContent("Oct 16, 2026")
    expect(methodRow("InPost courier")).toHaveTextContent("Kurier InPost")
  })

  it("says free delivery is off and counts nothing in an empty shop", () => {
    renderDelivery(<DeliveryMethodsTable />, { methods: [] })

    expect(screen.getByText("Off")).toBeInTheDocument()
    expect(screen.getByText("Every order pays for delivery")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Offered at checkout 0/u })).toHaveTextContent("0% of all")
  })
})

describe("DeliveryMethodsTable filters", () => {
  it("shows only the hidden methods from their card, and every current method again on a second click", async () => {
    renderDelivery(<DeliveryMethodsTable />)
    const hiddenCard = screen.getByRole("button", { name: /^Hidden 1/u })

    await user().click(hiddenCard)

    expect(hiddenCard).toHaveAttribute("aria-pressed", "true")
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent("InPost parcel locker")
    expect(handle("InPost parcel locker")).toBeDisabled()

    await user().click(hiddenCard)

    expect(bodyRows()).toHaveLength(2)
  })

  it("filters by status from the toolbar and back to every method but the archived ones", async () => {
    renderDelivery(<DeliveryMethodsTable />)

    await user().click(screen.getByRole("combobox", { name: "Filter by status" }))
    await user().click(await screen.findByRole("option", { name: "Archived" }))

    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent("Pickup at the atelier")
    expect(screen.getByRole("button", { name: /^Archived 1/u })).toHaveAttribute("aria-pressed", "true")

    await user().click(screen.getByRole("combobox", { name: "Filter by status" }))
    await user().click(await screen.findByRole("option", { name: "Offered" }))

    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent("InPost courier")

    await user().click(screen.getByRole("combobox", { name: "Filter by status" }))
    await user().click(await screen.findByRole("option", { name: "All but archived" }))

    expect(bodyRows()).toHaveLength(2)
    expect(screen.queryByText("Pickup at the atelier")).not.toBeInTheDocument()
  })

  it("finds a method by its name in either language or its carrier, and stops reordering while searching", async () => {
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.change(screen.getByPlaceholderText("Search delivery methods..."), { target: { value: "kurier" } })

    await waitFor(() => {
      expect(bodyRows()).toHaveLength(1)
    })
    expect(handle("InPost courier")).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText("Search delivery methods..."), { target: { value: "paczkomat" } })

    await waitFor(() => {
      expect(bodyRows()[0]).toHaveTextContent("InPost parcel locker")
    })
  })
})

describe("DeliveryMethodsTable reordering", () => {
  it("moves a method down with the arrow key and saves the new checkout order", async () => {
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.keyDown(handle("InPost courier"), { key: "ArrowDown" })

    await waitFor(() => {
      expect(mocks.reorder).toHaveBeenCalledWith([LOCKER.id, COURIER.id], expect.anything())
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Checkout order saved.")
  })

  it("moves a method up with the arrow key", async () => {
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.keyDown(handle("InPost parcel locker"), { key: "ArrowUp" })

    await waitFor(() => {
      expect(mocks.reorder).toHaveBeenCalledWith([LOCKER.id, COURIER.id], expect.anything())
    })
  })

  it("keeps archived methods out of the checkout order, wherever the list holds them", async () => {
    renderDelivery(<DeliveryMethodsTable />, { methods: [PICKUP, COURIER, LOCKER] })

    expect(bodyRows()[0]).toHaveTextContent("InPost courier")
    expect(bodyRows()[1]).toHaveTextContent("InPost parcel locker")

    fireEvent.keyDown(handle("InPost parcel locker"), { key: "ArrowDown" })

    expect(mocks.reorder).not.toHaveBeenCalled()

    fireEvent.keyDown(handle("InPost courier"), { key: "ArrowDown" })

    await waitFor(() => {
      expect(mocks.reorder).toHaveBeenCalledWith([LOCKER.id, COURIER.id], expect.anything())
    })
  })

  it("leaves the order alone past the top of the list or on another key", () => {
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.keyDown(handle("InPost courier"), { key: "ArrowUp" })
    fireEvent.keyDown(handle("InPost courier"), { key: "Enter" })

    expect(mocks.reorder).not.toHaveBeenCalled()
  })

  it("drags a method above another and saves the order once it is dropped", async () => {
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.dragStart(handle("InPost parcel locker"), { dataTransfer: { effectAllowed: "", setData: vi.fn() } })
    fireEvent.dragEnter(methodRow("InPost parcel locker"))
    fireEvent.dragEnter(methodRow("InPost courier"))
    fireEvent.dragEnd(handle("InPost parcel locker"))

    await waitFor(() => {
      expect(mocks.reorder).toHaveBeenCalledWith([LOCKER.id, COURIER.id], expect.anything())
    })
  })

  it("saves nothing when a method is dropped where it started", () => {
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.dragStart(handle("InPost courier"), { dataTransfer: { effectAllowed: "", setData: vi.fn() } })
    fireEvent.dragEnd(handle("InPost courier"))

    expect(mocks.reorder).not.toHaveBeenCalled()
  })

  it("ignores a row it is dragged over before any drag started", () => {
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.dragEnter(methodRow("InPost courier"))

    expect(bodyRows()[0]).toHaveTextContent("InPost courier")
  })

  it("explains why the order could not be saved", async () => {
    mocks.reorder.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    renderDelivery(<DeliveryMethodsTable />)

    fireEvent.keyDown(handle("InPost courier"), { key: "ArrowDown" })

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Someone changed this method in the meantime. Reload the page to see the change.")
    })
  })
})

describe("DeliveryMethodsTable row actions", () => {
  it("archives a method once the admin confirms", async () => {
    renderDelivery(<DeliveryMethodsTable />)
    const menu = await openRowMenu("InPost courier")

    await user().click(within(menu).getByRole("menuitem", { name: "Archive method" }))
    const confirm = await screen.findByRole("alertdialog", { name: "Archive InPost courier?" })
    await user().click(within(confirm).getByRole("button", { name: "Archive" }))

    await waitFor(() => {
      expect(mocks.archive).toHaveBeenCalledWith({ archived: true, id: COURIER.id }, expect.anything())
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("InPost courier archived.")
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
  })

  it("confirms an archive even when the status filter then hides the method", async () => {
    mocks.fetchMethods.mockResolvedValue({
      couriers: [INPOST],
      methods: [{ ...COURIER, archivedAt: new Date("2026-10-17T00:00:00.000Z"), isActive: false }, LOCKER, PICKUP],
    })
    renderDelivery(<DeliveryMethodsTable />)
    await user().click(screen.getByRole("button", { name: /^Offered at checkout/u }))
    const menu = await openRowMenu("InPost courier")

    await user().click(within(menu).getByRole("menuitem", { name: "Archive method" }))
    await user().click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Archive" }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("InPost courier archived.")
    })
    expect(screen.queryByText("InPost courier")).not.toBeInTheDocument()
  })

  it("keeps the method when the admin backs out of archiving it", async () => {
    renderDelivery(<DeliveryMethodsTable />)
    const menu = await openRowMenu("InPost courier")

    await user().click(within(menu).getByRole("menuitem", { name: "Archive method" }))
    const confirm = await screen.findByRole("alertdialog", { name: "Archive InPost courier?" })
    await user().click(within(confirm).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
    expect(mocks.archive).not.toHaveBeenCalled()
  })

  it("says why the last offered method cannot be archived", async () => {
    mocks.archive.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, "DELIVERY_METHOD_LAST_OFFERED"))
    renderDelivery(<DeliveryMethodsTable />)
    const menu = await openRowMenu("InPost courier")

    await user().click(within(menu).getByRole("menuitem", { name: "Archive method" }))
    await user().click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Archive" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining("Keep at least one method offered at checkout"))
    })
  })

  it("says why an archived method could not be restored", async () => {
    mocks.archive.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, "DELIVERY_METHOD_TYPE_ALREADY_OFFERED"))
    renderDelivery(<DeliveryMethodsTable />)
    await showArchivedMethods()
    const menu = await openRowMenu("Pickup at the atelier")

    await user().click(within(menu).getByRole("menuitem", { name: "Restore method" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining("one parcel locker method and one pickup method"))
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it("restores an archived method straight from its menu", async () => {
    renderDelivery(<DeliveryMethodsTable />)
    await showArchivedMethods()
    const menu = await openRowMenu("Pickup at the atelier")

    expect(within(menu).queryByRole("menuitem", { name: "Edit method" })).not.toBeInTheDocument()
    await user().click(within(menu).getByRole("menuitem", { name: "Restore method" }))

    await waitFor(() => {
      expect(mocks.archive).toHaveBeenCalledWith({ archived: false, id: PICKUP.id }, expect.anything())
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Pickup at the atelier restored. Turn it on to offer it again.")
  })

  it("opens the editor from the row menu", async () => {
    renderDelivery(<DeliveryMethodsTable />)
    const menu = await openRowMenu("InPost courier")

    await user().click(within(menu).getByRole("menuitem", { name: "Edit method" }))

    expect(await screen.findByRole("dialog", { name: "Edit InPost courier" })).toBeInTheDocument()
  })

  it("closes the menu without opening the row", async () => {
    renderDelivery(<DeliveryMethodsTable />)
    await openRowMenu("InPost courier")

    await act(async () => {
      await user().keyboard("{Escape}")
    })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
