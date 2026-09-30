import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Order } from "~/src/modules/order/order.types"

import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { useOrdersRowActionHandlers } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-row-action-handlers"

const { buildLocation, cancelMutate, fulfillMutate, navigate, pending, shipMutate, toastSuccess } = vi.hoisted(() => ({
  buildLocation: vi.fn(() => ({ href: "/admin/orders/order-1" })),
  cancelMutate: vi.fn<(input: { orderId: string }, settings?: { onSuccess?: () => void }) => void>(),
  fulfillMutate: vi.fn<(input: { orderId: string }) => void>(),
  navigate: vi.fn(),
  pending: { cancel: false, fulfill: false, ship: false },
  shipMutate: vi.fn<(input: { orderId: string }) => void>(),
  toastSuccess: vi.fn(),
}))

afterEach(cleanup)

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: toastSuccess } }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return { ...actual, useNavigate: () => navigate, useRouter: () => ({ buildLocation }) }
})

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useCancelOrder: () => ({ isPending: pending.cancel, mutate: cancelMutate }),
  useFulfillOrder: () => ({ isPending: pending.fulfill, mutate: fulfillMutate }),
  useMarkOrderShipped: () => ({ isPending: pending.ship, mutate: shipMutate }),
}))

const order = (overrides: Partial<Order["adminListItem"]> = {}): Order["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  currencyCode: "PLN",
  customerName: "Ada Nowak",
  email: "ada@example.test",
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: "unfulfilled",
  id: "order-1",
  initials: "AN",
  itemCount: 2,
  paymentUiKey: "paid",
  status: "processing",
  totalMinorUnits: 12_000,
  userId: null,
  ...overrides,
})

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const renderHandlers = (row: Order["adminListItem"], closeMenu = vi.fn<() => void>(), setConfirmOpen = vi.fn<(open: boolean) => void>()) =>
  renderHook(() => useOrdersRowActionHandlers(row, closeMenu, setConfirmOpen), { wrapper: Wrapper })

const noop = (): void => undefined

const noopOpen = (_open: boolean): void => undefined

const EventHarness = ({
  action,
  row,
}: Readonly<{
  action: () => void
  row: Order["adminListItem"]
}>): JSX.Element => {
  const handlers = useOrdersRowActionHandlers(row, noop, noopOpen)

  return (
    <>
      <button onClick={handlers.handleStopRowClick} type="button">
        stop
      </button>
      <button onClick={handlers.runMenuAction(action)} type="button">
        menu
      </button>
    </>
  )
}

describe("useOrdersRowActionHandlers availability", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pending.cancel = false
    pending.fulfill = false
    pending.ship = false
  })

  it("offers every action a paid, unfulfilled, processing order supports", () => {
    const { result } = renderHandlers(order())

    expect(result.current.canFulfill).toBe(true)
    expect(result.current.canShip).toBe(false)
    expect(result.current.canCancel).toBe(true)
    expect(result.current.canRefund).toBe(true)
    expect(result.current.canPrint).toBe(true)
  })

  it("offers shipping once the order is fulfilled and withdraws fulfilment", () => {
    const { result } = renderHandlers(order({ fulfillmentStatus: "fulfilled" }))

    expect(result.current.canFulfill).toBe(false)
    expect(result.current.canShip).toBe(true)
  })

  it("withdraws every state-changing action for a cancelled order", () => {
    const { result } = renderHandlers(order({ status: "cancelled" }))

    expect(result.current.canFulfill).toBe(false)
    expect(result.current.canShip).toBe(false)
    expect(result.current.canCancel).toBe(false)
    expect(result.current.canRefund).toBe(false)
    expect(result.current.canPrint).toBe(false)
  })

  it("keeps the invoice available for a refunded order but not the refund", () => {
    const { result } = renderHandlers(order({ status: "refunded" }))

    expect(result.current.canPrint).toBe(true)
    expect(result.current.canRefund).toBe(false)
  })

  it("withdraws the refund for an order that was only authorized", () => {
    const { result } = renderHandlers(order({ paymentUiKey: "authorized" }))

    expect(result.current.canRefund).toBe(false)
  })
})

describe("useOrdersRowActionHandlers actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pending.cancel = false
    pending.fulfill = false
    pending.ship = false
  })

  it("navigates to the order detail route", () => {
    const { result } = renderHandlers(order())

    result.current.handleViewOrder()

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ params: { orderId: "order-1" }, to: "/admin/orders/$orderId" })
  })

  it("sends the refund through the same detail route", () => {
    const { result } = renderHandlers(order())

    result.current.handleRefund()

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ params: { orderId: "order-1" }, to: "/admin/orders/$orderId" })
  })

  it("copies the order id and confirms it", async () => {
    const writeText = vi.fn(() => Promise.resolve(undefined))
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const { result } = renderHandlers(order())

    result.current.handleCopyId()
    await Promise.resolve()

    expect(writeText).toHaveBeenCalledExactlyOnceWith("order-1")
    expect(toastSuccess).toHaveBeenCalledExactlyOnceWith("Order ID copied")
    vi.unstubAllGlobals()
  })

  it("fulfils and ships by order id", () => {
    const { result } = renderHandlers(order())

    result.current.handleFulfill()
    result.current.handleMarkShipped()

    expect(fulfillMutate).toHaveBeenCalledExactlyOnceWith({ orderId: "order-1" })
    expect(shipMutate).toHaveBeenCalledExactlyOnceWith({ orderId: "order-1" })
  })

  it("opens the built invoice url in a new tab", () => {
    const openTab = vi.fn(() => null)
    vi.stubGlobal("open", openTab)
    const { result } = renderHandlers(order())

    result.current.handlePrintInvoice()

    expect(buildLocation).toHaveBeenCalledExactlyOnceWith({ params: { orderId: "order-1" }, to: "/admin/orders/$orderId" })
    expect(openTab).toHaveBeenCalledExactlyOnceWith("/admin/orders/order-1", "_blank", "noopener,noreferrer")
    vi.unstubAllGlobals()
  })

  it("asks the menu to close and open the confirm dialog on a cancel request", () => {
    const closeMenu = vi.fn<() => void>()
    const { result } = renderHandlers(order(), closeMenu)

    result.current.handleCancelRequest()

    expect(closeMenu).toHaveBeenCalledOnce()
    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })

  it("closes the confirm dialog only after the cancellation succeeds", () => {
    const setConfirmOpen = vi.fn<(open: boolean) => void>()
    const { result } = renderHandlers(order(), vi.fn<() => void>(), setConfirmOpen)

    result.current.handleConfirmCancel()

    expect(cancelMutate).toHaveBeenCalledOnce()
    expect(setConfirmOpen).not.toHaveBeenCalled()

    const onSuccess = cancelMutate.mock.calls[0]?.[1]?.onSuccess
    if (onSuccess === undefined) {
      throw new TypeError("expected the cancel mutation to receive an onSuccess callback")
    }
    onSuccess()

    expect(setConfirmOpen).toHaveBeenCalledExactlyOnceWith(false)
  })

  it("stops a row click from reaching the grid row without cancelling the click", () => {
    const outside = vi.fn<() => void>()
    document.body.addEventListener("click", outside)
    renderWithProviders(<EventHarness action={noop} row={order()} />)
    const clicked = fireEvent.click(screen.getByRole("button", { name: "stop" }))

    expect(clicked).toBe(true)
    expect(outside).not.toHaveBeenCalled()
    expect(consumeDataGridRowClickSuppression()).toBe(true)
    document.body.removeEventListener("click", outside)
  })

  it("swallows the click and runs the action a menu item wraps", () => {
    const outside = vi.fn<() => void>()
    const action = vi.fn<() => void>()
    document.body.addEventListener("click", outside)
    renderWithProviders(<EventHarness action={action} row={order()} />)
    const clicked = fireEvent.click(screen.getByRole("button", { name: "menu" }))

    expect(clicked).toBe(false)
    expect(action).toHaveBeenCalledOnce()
    expect(outside).not.toHaveBeenCalled()
    document.body.removeEventListener("click", outside)
  })

  it.each(["cancel", "fulfill", "ship"] as const)("reports pending while the %s mutation runs", (key) => {
    pending[key] = true
    const { result } = renderHandlers(order())

    expect(result.current.isPending).toBe(true)
  })

  it("reports nothing pending while every mutation is idle", () => {
    const { result } = renderHandlers(order())

    expect(result.current.isPending).toBe(false)
  })
})
