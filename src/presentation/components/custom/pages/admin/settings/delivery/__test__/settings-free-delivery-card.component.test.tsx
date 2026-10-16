import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

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

const { SettingsFreeDeliveryCard } =
  await import("~/src/presentation/components/custom/pages/admin/settings/delivery/settings-free-delivery-card")

const renderCard = (threshold: number | undefined) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY, { threshold })

  return renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <SettingsFreeDeliveryCard />
    </Suspense>,
    { queryClient },
  )
}

const user = () => userEvent.setup({ delay: null })

const thresholdInput = () => screen.getByLabelText("Free delivery from")

beforeEach(() => {
  vi.clearAllMocks()
  mocks.save.mockResolvedValue({ threshold: undefined })
})

afterEach(cleanup)

describe("SettingsFreeDeliveryCard", () => {
  it("shows the threshold the shop already offers", () => {
    renderCard(30_000)

    expect(screen.getByRole("switch", { name: "Offer free delivery" })).toBeChecked()
    expect(thresholdInput()).toHaveValue("300.00")
  })

  it("hides the amount while free delivery is off and saves a new threshold once it is turned on", async () => {
    renderCard(undefined)

    expect(screen.queryByLabelText("Free delivery from")).not.toBeInTheDocument()

    await user().click(screen.getByRole("switch", { name: "Offer free delivery" }))
    fireEvent.change(thresholdInput(), { target: { value: "250" } })
    await user().click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Free delivery saved.")
    })
    expect(mocks.save.mock.calls[0]?.[0]).toStrictEqual({ threshold: 25_000 })
  })

  it("turns free delivery off by saving without a threshold", async () => {
    renderCard(30_000)

    await user().click(screen.getByRole("switch", { name: "Offer free delivery" }))
    await user().click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.save).toHaveBeenCalledOnce()
    })
    expect(mocks.save.mock.calls[0]?.[0]).toStrictEqual({ threshold: undefined })
  })

  it.each(["", "0"])("asks for an amount above zero instead of saving %j", async (value) => {
    renderCard(30_000)

    fireEvent.change(thresholdInput(), { target: { value } })
    await user().click(screen.getByRole("button", { name: "Save" }))

    expect(screen.getByText("Enter a value above 0.")).toBeInTheDocument()
    expect(thresholdInput()).toHaveAttribute("aria-invalid", "true")
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it("tells the admin when saving fails", async () => {
    mocks.save.mockRejectedValue(new Error("network down"))
    renderCard(30_000)

    await user().click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Something went wrong. Please try again.")
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })
})
