import { type JSX, type ReactNode } from "react"

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderDelivery, user } from "~/src/presentation/components/custom/pages/admin/settings/delivery/__test__/delivery-fixtures"

const mocks = vi.hoisted(() => ({
  save: vi.fn<(input: { threshold?: number }) => Promise<unknown>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/store-setting/use-cases/get-free-delivery", () => ({
  getAdminFreeDeliveryQuery: () => ({
    queryFn: () => Promise.reject(new Error("the threshold is seeded by the test")),
    queryKey: ["admin", "store-setting", "free-delivery"],
  }),
}))
vi.mock("~/src/modules/store-setting/use-cases/set-free-delivery-threshold", () => ({
  setFreeDeliveryThresholdMutation: { mutationFn: mocks.save, mutationKey: ["store-setting", "setFreeDeliveryThreshold"] },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({ actions, tabs, title }: Readonly<{ actions?: ReactNode; tabs?: ReactNode; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      {actions}
      {tabs}
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-table", () => ({
  DeliveryMethodsTable: (): JSX.Element => <section>delivery methods grid</section>,
}))

const { SettingsDeliveryPage } = await import("~/src/presentation/components/custom/pages/admin/settings/delivery/settings-delivery-page")

const openFreeDelivery = async (threshold?: number) => {
  renderDelivery(<SettingsDeliveryPage />, threshold === undefined ? {} : { threshold })
  await user().click(screen.getByRole("button", { name: "Free delivery" }))

  return screen.findByRole("dialog", { name: "Free delivery" })
}

const thresholdInput = (sheet: HTMLElement) => within(sheet).getByLabelText("Free delivery from")

const chooseStatus = async (sheet: HTMLElement, option: string) => {
  await user().click(within(sheet).getByRole("combobox", { name: "Free delivery" }))
  await user().click(await screen.findByRole("option", { name: option }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.save.mockResolvedValue({ threshold: undefined })
})

afterEach(cleanup)

describe("SettingsDeliveryPage", () => {
  it("shows the delivery grid under the Delivery tab with the free delivery action in the header", () => {
    renderDelivery(<SettingsDeliveryPage />)

    expect(screen.getByText("delivery methods grid")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Delivery" }).className).toContain("font-medium")
    expect(screen.getByRole("button", { name: "Free delivery" })).toBeInTheDocument()
  })

  it("opens the threshold the shop already offers", async () => {
    const sheet = await openFreeDelivery(30_000)

    expect(within(sheet).getByRole("combobox", { name: "Free delivery" })).toHaveTextContent("Offered")
    expect(thresholdInput(sheet)).toHaveValue("300.00")
  })

  it("offers free delivery from a new threshold and closes", async () => {
    const sheet = await openFreeDelivery()

    expect(within(sheet).queryByLabelText("Free delivery from")).not.toBeInTheDocument()
    await chooseStatus(sheet, "Offered")
    fireEvent.change(thresholdInput(sheet), { target: { value: "250" } })
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledWith({ threshold: 25_000 }, expect.anything())
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Free delivery saved.")
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("asks for a threshold above zero before saving", async () => {
    const sheet = await openFreeDelivery()

    await chooseStatus(sheet, "Offered")
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    expect(within(sheet).getByText("Enter a value above 0.")).toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()

    fireEvent.change(thresholdInput(sheet), { target: { value: "0" } })
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    expect(mocks.save).not.toHaveBeenCalled()
  })

  it("asks for a threshold again once it was cleared", async () => {
    const sheet = await openFreeDelivery(30_000)

    fireEvent.change(thresholdInput(sheet), { target: { value: "" } })
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    expect(within(sheet).getByText("Enter a value above 0.")).toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it("stops offering free delivery", async () => {
    const sheet = await openFreeDelivery(30_000)

    await chooseStatus(sheet, "Not offered")
    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledWith({ threshold: undefined }, expect.anything())
    })
  })

  it("keeps the sheet open and says what went wrong when saving fails", async () => {
    mocks.save.mockRejectedValue(new Error("network down"))
    const sheet = await openFreeDelivery(30_000)

    await user().click(within(sheet).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Something went wrong. Please try again.")
    })
    expect(screen.getByRole("dialog", { name: "Free delivery" })).toBeInTheDocument()
  })

  it("closes without saving on cancel", async () => {
    const sheet = await openFreeDelivery(30_000)

    await user().click(within(sheet).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(mocks.save).not.toHaveBeenCalled()
  })
})
