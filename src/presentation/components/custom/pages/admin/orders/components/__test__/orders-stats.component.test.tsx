import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_STAT_FILTER, type AdminOrderStatFilter } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

const STATS_KEY = ["admin", "orders", "stats"] as const

const STATS: Order["adminStats"] = {
  avgValueMinorUnits: 45_000,
  currencyCode: "PLN",
  pending: 3,
  revenueMinorUnits: 123_456,
  totalOrders: 42,
}

const statsQuery = vi.hoisted(() => ({ neverSettles: false }))

const contextRef = vi.hoisted(() => ({
  activeStatFilter: undefined as string | undefined,
  applyOrderStatFilter: vi.fn<(filter?: string) => void>(),
}))

vi.mock("~/src/modules/order/use-cases/get-admin-order-stats", () => ({
  getAdminOrderStatsQuery: () => ({
    queryFn: () => (statsQuery.neverSettles ? new Promise<Order["adminStats"]>(() => {}) : Promise.resolve(STATS)),
    queryKey: STATS_KEY,
    staleTime: Number.POSITIVE_INFINITY,
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid", () => ({
  useOrdersDataGridContext: () => contextRef,
}))

import { OrdersStats } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-stats"

const inPln = (major: number): string =>
  new Intl.NumberFormat("en-US", { currency: "PLN", style: "currency" }).format(major).replaceAll(/\s/gu, " ")

const renderStats = (activeFilter?: AdminOrderStatFilter) => {
  contextRef.activeStatFilter = activeFilter
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(STATS_KEY, STATS)

  return renderWithProviders(
    <Suspense fallback={<p>loading order figures</p>}>
      <OrdersStats />
    </Suspense>,
    { queryClient },
  )
}

const card = (name: RegExp): HTMLElement => screen.getByRole("button", { name })

const startRefreshing = async (queryClient: QueryClient): Promise<void> => {
  statsQuery.neverSettles = true
  act(() => {
    void queryClient.invalidateQueries({ queryKey: STATS_KEY })
  })
  await waitFor(() => {
    expect(card(/Pending/u)).toHaveAttribute("aria-busy", "true")
  })
}

beforeEach(() => {
  contextRef.applyOrderStatFilter.mockClear()
  statsQuery.neverSettles = false
})

afterEach(cleanup)

describe("OrdersStats", () => {
  it("shows one card per figure with its translated label", async () => {
    renderStats()

    expect(await screen.findByText("Total Orders")).toBeInTheDocument()
    expect(screen.getByText("Pending")).toBeInTheDocument()
    expect(screen.getByText("Revenue")).toBeInTheDocument()
    expect(screen.getByText("Avg. Value")).toBeInTheDocument()
  })

  it("counts the orders plainly and prices the money figures in the order currency", async () => {
    renderStats()

    expect(await screen.findByText("42")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText(inPln(1234.56))).toBeInTheDocument()
    expect(screen.getByText(inPln(450))).toBeInTheDocument()
  })

  it("makes only the two cards that carry a status filter pressable", async () => {
    renderStats()

    await screen.findByText("Total Orders")

    expect(screen.getAllByRole("button")).toHaveLength(2)
    expect(card(/Total Orders/u)).toBeInTheDocument()
    expect(card(/Pending/u)).toBeInTheDocument()
  })

  it("narrows the table to the pending orders from the pending card", async () => {
    renderStats()

    await userEvent.click(card(/Pending/u))

    expect(contextRef.applyOrderStatFilter).toHaveBeenCalledWith(ADMIN_ORDER_STAT_FILTER.PENDING)
  })

  it("drops the pending filter again when its own card is pressed a second time", async () => {
    renderStats(ADMIN_ORDER_STAT_FILTER.PENDING)

    await userEvent.click(card(/Pending/u))

    expect(contextRef.applyOrderStatFilter).toHaveBeenCalledWith(undefined)
  })

  it("clears the filter from the total card", async () => {
    renderStats(ADMIN_ORDER_STAT_FILTER.PENDING)

    await userEvent.click(card(/Total Orders/u))

    expect(contextRef.applyOrderStatFilter).toHaveBeenCalledWith()
  })

  it("marks the total card active while no status filter is set", async () => {
    renderStats()

    expect(await screen.findByRole("button", { name: /Total Orders/u })).toHaveAttribute("aria-pressed", "true")
  })

  it("moves the active mark onto the pending card once that filter is set", async () => {
    renderStats(ADMIN_ORDER_STAT_FILTER.PENDING)

    expect(await screen.findByRole("button", { name: /Pending/u })).toHaveAttribute("aria-pressed", "true")
    expect(card(/Total Orders/u)).toHaveAttribute("aria-pressed", "false")
  })
})

describe("OrdersStats while the figures are being refreshed", () => {
  it("holds back every value rather than showing a number it knows is out of date", async () => {
    const { queryClient } = renderStats()
    await screen.findByText("42")

    await startRefreshing(queryClient)

    expect(screen.queryByText("42")).not.toBeInTheDocument()
    expect(screen.queryByText("3")).not.toBeInTheDocument()
    expect(screen.queryByText(inPln(1234.56))).not.toBeInTheDocument()
  })

  it("keeps the labels in place so the cards do not jump while refreshing", async () => {
    const { queryClient } = renderStats()
    await screen.findByText("42")

    await startRefreshing(queryClient)

    expect(screen.getByText("Total Orders")).toBeInTheDocument()
    expect(screen.getByText("Revenue")).toBeInTheDocument()
  })

  it("keeps the filter cards from acting on figures it is still fetching", async () => {
    const { queryClient } = renderStats()
    await screen.findByText("42")

    await startRefreshing(queryClient)

    expect(card(/Total Orders/u)).toBeDisabled()
    expect(card(/Pending/u)).toBeDisabled()
  })
})
