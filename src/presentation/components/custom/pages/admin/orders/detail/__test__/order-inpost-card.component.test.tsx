import { cleanup, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface MutateOptions {
  readonly onSuccess?: () => void
}

type Mutate = (variables: unknown, options?: MutateOptions) => void

const mutations = vi.hoisted(() => ({
  create: vi.fn<Mutate>(),
  label: vi.fn<Mutate>(),
  pending: { create: false, label: false, refresh: false },
  refresh: vi.fn<Mutate>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-inpost-shipment-actions", () => ({
  useCreateInpostShipment: () => ({ isPending: mutations.pending.create, mutate: mutations.create }),
  useDownloadInpostLabel: () => ({ isPending: mutations.pending.label, mutate: mutations.label }),
  useRefreshInpostShipment: () => ({ isPending: mutations.pending.refresh, mutate: mutations.refresh }),
}))

import {
  ORDER_ID,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderInpostCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-inpost-card"

const NOT_CONFIGURED = /Automatic InPost shipping is not connected/u

const openLockerOrder = (overrides: Parameters<typeof buildAdminOrderDetail>[0] = {}) =>
  buildAdminOrderDetail({ fulfillmentStatus: "fulfilled", fulfillmentUiKey: "processing", trackingNumber: undefined, ...overrides })

const shippedWithInpost = (status: string | undefined, overrides: Parameters<typeof buildAdminOrderDetail>[0] = {}) =>
  buildAdminOrderDetail({ inpostShipment: { id: "1234567890", status }, ...overrides })

beforeEach(() => {
  vi.clearAllMocks()
  mutations.pending = { create: false, label: false, refresh: false }
  mutations.create.mockImplementation((_variables, options) => {
    options?.onSuccess?.()
  })
})

afterEach(cleanup)

describe("OrderInpostCard", () => {
  it("stays off an in-store pickup that InPost never carries", () => {
    const { container } = renderWithProviders(
      <OrderInpostCard
        order={openLockerOrder({
          delivery: {
            courierName: undefined,
            lockerId: undefined,
            lockerPoint: undefined,
            lockerUnconfirmed: false,
            methodName: "Odbiór w atelier",
            type: "in_store",
          },
        })}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("books a shipment for an open locker order in the size the admin picks", async () => {
    renderWithProviders(<OrderInpostCard order={openLockerOrder()} />)

    expect(screen.getByText("InPost shipment")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Create shipment" }))
    const dialog = await screen.findByRole("dialog", { name: "Create an InPost shipment" })
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Parcel size" }), "medium")
    await userEvent.click(within(dialog).getByRole("button", { name: "Create shipment" }))

    expect(mutations.create).toHaveBeenCalledWith({ orderId: ORDER_ID, parcelTemplate: "medium", weightKg: undefined }, expect.anything())
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("keeps the dialog open while InPost has not booked the parcel", async () => {
    mutations.create.mockImplementation(() => {})
    renderWithProviders(<OrderInpostCard order={openLockerOrder()} />)

    await userEvent.click(screen.getByRole("button", { name: "Create shipment" }))
    const dialog = await screen.findByRole("dialog", { name: "Create an InPost shipment" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Create shipment" }))

    expect(mutations.create).toHaveBeenCalledOnce()
    expect(screen.getByRole("dialog", { name: "Create an InPost shipment" })).toBeInTheDocument()
  })

  it("locks the create button while a shipment is being booked", () => {
    mutations.pending.create = true
    renderWithProviders(<OrderInpostCard order={openLockerOrder()} />)

    expect(screen.getByRole("button", { name: "Create shipment" })).toBeDisabled()
  })

  it("asks for a courier parcel's weight", async () => {
    renderWithProviders(
      <OrderInpostCard
        order={openLockerOrder({
          delivery: {
            courierName: "InPost",
            lockerId: undefined,
            lockerPoint: undefined,
            lockerUnconfirmed: false,
            methodName: "Kurier InPost",
            type: "courier",
          },
        })}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Create shipment" }))

    expect(await screen.findByRole("spinbutton", { name: "Weight (kg)" })).toBeInTheDocument()
  })

  it("explains why an order that has shipped gets no new shipment", () => {
    renderWithProviders(<OrderInpostCard order={buildAdminOrderDetail()} />)

    expect(screen.getByText("A shipment can be created while the order is open and not yet shipped.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create shipment" })).toBeNull()
  })

  it("explains how to ship by hand instead of offering a shipment it cannot book", () => {
    renderWithProviders(<OrderInpostCard order={openLockerOrder({ inpostConfigured: false })} />)

    expect(screen.getByText(NOT_CONFIGURED)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create shipment" })).toBeNull()
  })

  it.each([
    ["ready_to_pickup", "Ready to pick up"],
    ["adopted_at_sorting_center", "adopted_at_sorting_center"],
    [undefined, "Not reported yet"],
  ])("shows the shipment and its %s status", (status, label) => {
    renderWithProviders(<OrderInpostCard order={shippedWithInpost(status)} />)

    expect(screen.getByText("1234567890")).toBeInTheDocument()
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("refreshes the status and downloads the label of the order's shipment", async () => {
    renderWithProviders(<OrderInpostCard order={shippedWithInpost("confirmed")} />)

    await userEvent.click(screen.getByRole("button", { name: "Refresh status" }))
    await userEvent.click(screen.getByRole("button", { name: "Download label" }))

    expect(mutations.refresh).toHaveBeenCalledWith({ orderId: ORDER_ID })
    expect(mutations.label).toHaveBeenCalledWith({ orderId: ORDER_ID })
  })

  it.each([
    ["refresh", "Refresh status"],
    ["label", "Download label"],
  ] as const)("spins the %s button and locks both while InPost answers", (pending, name) => {
    mutations.pending[pending] = true
    renderWithProviders(<OrderInpostCard order={shippedWithInpost("confirmed")} />)

    expect(screen.getByRole("button", { name }).querySelector(".animate-spin")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Download label" })).toBeDisabled()
  })

  it("keeps an existing shipment visible but out of reach once the InPost credentials are gone", () => {
    renderWithProviders(<OrderInpostCard order={shippedWithInpost("confirmed", { inpostConfigured: false })} />)

    expect(screen.getByText("1234567890")).toBeInTheDocument()
    expect(screen.getByText(NOT_CONFIGURED)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Download label" })).toBeDisabled()
  })

  it("shows a shipment even on an order whose delivery method was removed", () => {
    renderWithProviders(<OrderInpostCard order={shippedWithInpost("delivered", { delivery: undefined })} />)

    expect(screen.getByText("Delivered")).toBeInTheDocument()
  })
})

describe("OrderInpostCard replacing a shipment", () => {
  it("offers a new shipment under one InPost cancelled while the order is still open", async () => {
    renderWithProviders(<OrderInpostCard order={openLockerOrder({ inpostShipment: { id: "1234567890", status: "canceled" } })} />)

    expect(screen.getByText("Cancelled")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Create shipment" }))
    const dialog = await screen.findByRole("dialog", { name: "Create an InPost shipment" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Create shipment" }))

    expect(mutations.create).toHaveBeenCalledWith({ orderId: ORDER_ID, parcelTemplate: "small", weightKg: undefined }, expect.anything())
  })

  it("offers no new shipment under a cancelled one once the order has shipped", () => {
    renderWithProviders(<OrderInpostCard order={shippedWithInpost("canceled")} />)

    expect(screen.getByText("Cancelled")).toBeInTheDocument()
    expect(screen.getByText("A shipment can be created while the order is open and not yet shipped.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create shipment" })).toBeNull()
  })

  it("offers no new shipment under a cancelled one once the InPost credentials are gone", () => {
    renderWithProviders(
      <OrderInpostCard order={openLockerOrder({ inpostConfigured: false, inpostShipment: { id: "1234567890", status: "canceled" } })} />,
    )

    expect(screen.getByText(NOT_CONFIGURED)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create shipment" })).toBeNull()
  })

  it("offers no second shipment while the order's shipment is live", () => {
    renderWithProviders(<OrderInpostCard order={openLockerOrder({ inpostShipment: { id: "1234567890", status: "confirmed" } })} />)

    expect(screen.getByText("Ready to send")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create shipment" })).toBeNull()
  })
})
