import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_STAT_FILTER, type AdminOrderStatFilter } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import {
  OrderStatCard,
  formatOrderStatDisplayValue,
  resolveOrderStatValue,
} from "~/src/presentation/components/custom/pages/admin/orders/components/order-stat-card"
import {
  ORDER_STAT_CARDS,
  type OrderStatCardConfig,
  type OrderStatKey,
} from "~/src/presentation/components/custom/pages/admin/orders/orders-stats.config"

const cardConfig = (key: OrderStatKey): OrderStatCardConfig => {
  const config = ORDER_STAT_CARDS.find((candidate) => candidate.key === key)
  if (config === undefined) {
    throw new Error(`No order stat card is configured for ${key}`)
  }

  return config
}

const stats: Order["adminStats"] = {
  avgValueMinorUnits: 45_000,
  currencyCode: "PLN",
  pending: 3,
  revenueMinorUnits: 123_456,
  totalOrders: 42,
}

afterEach(() => {
  cleanup()
})

describe("OrderStatCard", () => {
  it("shows the translated label next to the value", () => {
    renderWithProviders(<OrderStatCard config={cardConfig("totalOrders")} currencyCode="PLN" displayValue="42" valuesPending={false} />)

    expect(screen.getByText("Total Orders")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("shows the caption it was handed", () => {
    renderWithProviders(
      <OrderStatCard
        caption="3 awaiting payment"
        config={cardConfig("pending")}
        currencyCode="PLN"
        displayValue="3"
        valuesPending={false}
      />,
    )

    expect(screen.getByText("3 awaiting payment")).toBeInTheDocument()
  })

  it("hides the value while the stats are still loading", () => {
    renderWithProviders(
      <OrderStatCard
        config={cardConfig("pending")}
        currencyCode="PLN"
        displayValue="3"
        valuesPending
        onFilter={vi.fn<(filter?: AdminOrderStatFilter) => void>()}
      />,
    )

    expect(screen.queryByText("3")).not.toBeInTheDocument()
    expect(screen.getByRole("button")).toBeDisabled()
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true")
  })

  it("renders no button when there is no filter handler", () => {
    renderWithProviders(<OrderStatCard config={cardConfig("pending")} currencyCode="PLN" displayValue="3" valuesPending={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders no button for a stat that cannot be filtered on", () => {
    renderWithProviders(
      <OrderStatCard
        config={cardConfig("revenueMinorUnits")}
        currencyCode="PLN"
        displayValue="PLN 1,234.56"
        valuesPending={false}
        onFilter={vi.fn<(filter?: AdminOrderStatFilter) => void>()}
      />,
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("OrderStatCard filtering", () => {
  it("clears the filter when the total card is pressed", () => {
    const onFilter = vi.fn<(filter?: AdminOrderStatFilter) => void>()
    renderWithProviders(
      <OrderStatCard
        activeFilter={ADMIN_ORDER_STAT_FILTER.PENDING}
        config={cardConfig("totalOrders")}
        currencyCode="PLN"
        displayValue="42"
        valuesPending={false}
        onFilter={onFilter}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("applies the pending filter when its card is pressed", () => {
    const onFilter = vi.fn<(filter?: AdminOrderStatFilter) => void>()
    renderWithProviders(
      <OrderStatCard config={cardConfig("pending")} currencyCode="PLN" displayValue="3" valuesPending={false} onFilter={onFilter} />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(ADMIN_ORDER_STAT_FILTER.PENDING)
  })

  it("drops the pending filter when its card is pressed again", () => {
    const onFilter = vi.fn<(filter?: AdminOrderStatFilter) => void>()
    renderWithProviders(
      <OrderStatCard
        activeFilter={ADMIN_ORDER_STAT_FILTER.PENDING}
        config={cardConfig("pending")}
        currencyCode="PLN"
        displayValue="3"
        valuesPending={false}
        onFilter={onFilter}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(undefined)
  })

  it("ignores a press while the stats are still loading", () => {
    const onFilter = vi.fn<(filter?: AdminOrderStatFilter) => void>()
    renderWithProviders(
      <OrderStatCard config={cardConfig("pending")} currencyCode="PLN" displayValue="3" valuesPending onFilter={onFilter} />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).not.toHaveBeenCalled()
  })

  it("marks the total card as pressed while no filter is set", () => {
    renderWithProviders(
      <OrderStatCard
        config={cardConfig("totalOrders")}
        currencyCode="PLN"
        displayValue="42"
        valuesPending={false}
        onFilter={vi.fn<(filter?: AdminOrderStatFilter) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("marks the total card as pressed while the total filter is set", () => {
    renderWithProviders(
      <OrderStatCard
        activeFilter={ADMIN_ORDER_STAT_FILTER.TOTAL}
        config={cardConfig("totalOrders")}
        currencyCode="PLN"
        displayValue="42"
        valuesPending={false}
        onFilter={vi.fn<(filter?: AdminOrderStatFilter) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("leaves the pending card unpressed while another filter is set", () => {
    renderWithProviders(
      <OrderStatCard
        activeFilter={ADMIN_ORDER_STAT_FILTER.TOTAL}
        config={cardConfig("pending")}
        currencyCode="PLN"
        displayValue="3"
        valuesPending={false}
        onFilter={vi.fn<(filter?: AdminOrderStatFilter) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })
})

describe("formatOrderStatDisplayValue", () => {
  it.each(["revenueMinorUnits", "avgValueMinorUnits"] as const)("formats %s as money", (key) => {
    const formatted = formatOrderStatDisplayValue({ currencyCode: "PLN", key, locale: "en-US", value: 123_456 })

    expect(formatted).toContain("1,234.56")
    expect(formatted).toContain("PLN")
  })

  it.each(["totalOrders", "pending"] as const)("formats %s as a plain count", (key) => {
    expect(formatOrderStatDisplayValue({ currencyCode: "PLN", key, locale: "en-US", value: 1234 })).toBe("1,234")
  })

  it("leaves a count free of any currency", () => {
    expect(formatOrderStatDisplayValue({ currencyCode: "PLN", key: "pending", locale: "en-US", value: 7 })).toBe("7")
  })
})

describe("resolveOrderStatValue", () => {
  it.each(["avgValueMinorUnits", "pending", "revenueMinorUnits", "totalOrders"] as const)("reads %s off the stats", (key) => {
    expect(resolveOrderStatValue(stats, key)).toBe(stats[key])
  })
})
