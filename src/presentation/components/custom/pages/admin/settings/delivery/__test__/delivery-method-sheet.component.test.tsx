import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

import {
  COURIER,
  UPDATED_AT,
  renderDelivery,
  showArchivedMethods,
  user,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/__test__/delivery-fixtures"

const mocks = vi.hoisted(() => ({
  create: vi.fn<(input: unknown) => Promise<unknown>>(),
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
vi.mock("~/src/modules/store-setting/use-cases/get-free-delivery", () => ({
  getAdminFreeDeliveryQuery: () => ({
    queryFn: () => Promise.reject(new Error("the threshold is seeded by the test")),
    queryKey: ["admin", "store-setting", "free-delivery"],
  }),
}))
vi.mock("~/src/modules/delivery-method/use-cases/create-delivery-method", () => ({
  createDeliveryMethodMutation: { mutationFn: mocks.create, mutationKey: ["delivery-method", "create"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/update-delivery-method", () => ({
  updateDeliveryMethodMutation: { mutationFn: mocks.update, mutationKey: ["delivery-method", "update"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/archive-delivery-method", () => ({
  archiveDeliveryMethodMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "archive"] },
}))
vi.mock("~/src/modules/delivery-method/use-cases/reorder-delivery-methods", () => ({
  reorderDeliveryMethodsMutation: { mutationFn: vi.fn(), mutationKey: ["delivery-method", "reorder"] },
}))

const { DeliveryMethodsTable } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-table")

const openAdd = async () => {
  renderDelivery(<DeliveryMethodsTable />)
  await user().click(screen.getByRole("button", { name: "Add method" }))

  return screen.findByRole("dialog", { name: "Add a delivery method" })
}

const openEdit = async () => {
  renderDelivery(<DeliveryMethodsTable />)
  await user().click(screen.getByText("InPost courier"))

  return screen.findByRole("dialog", { name: "Edit InPost courier" })
}

const choose = async (sheet: HTMLElement, field: string, option: string) => {
  await user().click(within(sheet).getByRole("combobox", { name: field }))
  await user().click(await screen.findByRole("option", { name: option }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({ id: "new" })
  mocks.update.mockResolvedValue({ id: COURIER.id })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("DeliveryMethodSheet opening", () => {
  it("opens no editor for an archived method's row, only for a current one", async () => {
    renderDelivery(<DeliveryMethodsTable />)
    await showArchivedMethods()

    await user().click(screen.getByText("Pickup at the atelier"))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await showArchivedMethods()
    await user().click(screen.getByText("InPost courier"))

    expect(await screen.findByRole("dialog", { name: "Edit InPost courier" })).toBeInTheDocument()
  })
})

describe("DeliveryMethodSheet adding a method", () => {
  it("points each missing field out instead of saving", async () => {
    const sheet = await openAdd()

    await user().click(within(sheet).getByRole("button", { name: "Add method" }))

    expect(within(sheet).getAllByText("Enter a name.")).toHaveLength(2)
    expect(within(sheet).getByText("Enter a price of 0 or more.")).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("adds a hidden courier method with a new carrier, warning that it ships by hand", async () => {
    const sheet = await openAdd()

    await choose(sheet, "Carrier", "New carrier")
    expect(within(sheet).getByText(/Only InPost parcels are booked from the order page/u)).toBeInTheDocument()
    fireEvent.change(within(sheet).getByLabelText("Carrier name"), { target: { value: "DPD" } })
    fireEvent.change(within(sheet).getByLabelText("Name in Polish"), { target: { value: "Kurier DPD" } })
    fireEvent.change(within(sheet).getByLabelText("Name in English"), { target: { value: "DPD courier" } })
    fireEvent.change(within(sheet).getByLabelText("Price"), { target: { value: "18.99" } })
    await choose(sheet, "Status", "Hidden")
    expect(within(sheet).getByText("3/60")).toBeInTheDocument()
    await user().click(within(sheet).getByRole("button", { name: "Add method" }))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith(
        {
          courier: { name: "DPD" },
          isActive: false,
          names: { "en-US": "DPD courier", "pl-PL": "Kurier DPD" },
          price: 1899,
          type: "courier",
        },
        expect.anything(),
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Delivery method added.")
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("keeps the form as it is when the admin picks the type and carrier already chosen", async () => {
    const sheet = await openAdd()
    fireEvent.change(within(sheet).getByLabelText("Name in Polish"), { target: { value: "Kurier" } })

    await choose(sheet, "Type", "Courier")
    await choose(sheet, "Carrier", "InPost")
    await choose(sheet, "Status", "Offered")

    expect(within(sheet).getByLabelText("Name in Polish")).toHaveValue("Kurier")
    expect(within(sheet).queryByLabelText("Carrier name")).not.toBeInTheDocument()
  })

  it("books a parcel locker method with InPost and says so", async () => {
    const sheet = await openAdd()

    await choose(sheet, "Type", "Parcel locker")

    expect(within(sheet).getByRole("combobox", { name: "Carrier" })).toHaveAttribute("data-disabled")
    expect(within(sheet).getByText(/Parcel lockers are InPost's/u)).toBeInTheDocument()
  })

  it("explains why the server refused the method and stays open", async () => {
    mocks.create.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, "DELIVERY_METHOD_TYPE_ALREADY_OFFERED"))
    const sheet = await openAdd()
    fireEvent.change(within(sheet).getByLabelText("Name in Polish"), { target: { value: "Kurier" } })
    fireEvent.change(within(sheet).getByLabelText("Name in English"), { target: { value: "Courier" } })
    fireEvent.change(within(sheet).getByLabelText("Price"), { target: { value: "0" } })

    await user().click(within(sheet).getByRole("button", { name: "Add method" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining("one parcel locker method and one pickup method"))
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})

describe("DeliveryMethodSheet editing a method", () => {
  it("saves a new price and hides the method from the checkout", async () => {
    const sheet = await openEdit()

    expect(within(sheet).getByText("Courier · InPost")).toBeInTheDocument()
    expect(within(sheet).queryByRole("combobox", { name: "Type" })).not.toBeInTheDocument()
    fireEvent.change(within(sheet).getByLabelText("Price"), { target: { value: "21.99" } })
    await choose(sheet, "Status", "Hidden")
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

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
    const sheet = await openEdit()

    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Someone changed this method in the meantime. Reload the page to see the change.")
    })
  })

  it("asks for a price again once it was cleared", async () => {
    const sheet = await openEdit()

    fireEvent.change(within(sheet).getByLabelText("Price"), { target: { value: "" } })
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    expect(within(sheet).getByText("Enter a price of 0 or more.")).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("reports an unexpected failure in general terms", async () => {
    mocks.update.mockRejectedValue(new Error("network down"))
    const sheet = await openEdit()

    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Something went wrong. Please try again.")
    })
  })

  it("stays open while a save is on its way", async () => {
    mocks.update.mockReturnValue(new Promise(() => {}))
    const sheet = await openEdit()

    await user().click(within(sheet).getByRole("button", { name: "Save" }))
    await user().keyboard("{Escape}")

    expect(screen.getByRole("dialog", { name: "Edit InPost courier" })).toBeInTheDocument()
  })

  it("closes on Escape without saving", async () => {
    await openEdit()

    await user().keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("closes without saving on cancel", async () => {
    const sheet = await openEdit()

    await user().click(within(sheet).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
